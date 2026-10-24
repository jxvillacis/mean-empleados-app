// Alertas de PM2 por webhook (Discord o Slack). Corre como una app más de PM2 y escucha su bus de eventos.
// Avisa cuando una app vigilada se detiene (manualmente o por una caída) y cuando vuelve a estar en línea.
// Se usa en lugar de pm2-notify, que solo envía correos por SMTP y no avisa de las detenciones manuales.
//
// Configuración (variables de entorno, ver ecosystem.config.js):
//   ALERT_WEBHOOK_URL   webhook de Discord (https://discord.com/api/webhooks/...) o de Slack (https://hooks.slack.com/...)
//   ALERTAS_ENV_FILE    archivo .env de donde leer ALERT_WEBHOOK_URL si no viene en el entorno (no se versiona)
//   VIGILAR             apps a vigilar, separadas por comas (vacío = todas menos esta)
const fs = require('fs');
const os = require('os');
const pm2 = require('pm2');

const SELF = process.env.name || 'mean-alertas';
const VIGILAR = (process.env.VIGILAR || '').split(',').map(s => s.trim()).filter(Boolean);
const AGRUPAR_MS = 2000; // las instancias del clúster emiten un evento cada una: se agrupan en un solo mensaje

function leerEnv(file) {
  if (!file || !fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/)
    .filter(l => /^[A-Z0-9_]+=/.test(l)).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
}
const WEBHOOK = process.env.ALERT_WEBHOOK_URL || leerEnv(process.env.ALERTAS_ENV_FILE).ALERT_WEBHOOK_URL;
if (!WEBHOOK) {
  console.error('Falta ALERT_WEBHOOK_URL: no se pueden enviar alertas.');
  process.exit(1);
}
const esSlack = /hooks\.slack\.com/.test(WEBHOOK);

async function enviar(texto) {
  try {
    const res = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(esSlack ? { text: texto } : { content: texto })
    });
    console.log(`[alerta] ${res.status} ${texto.split('\n')[0]}`);
  } catch (err) {
    console.error('[alerta] no se pudo enviar:', err.message);
  }
}

// Agrupa los eventos por app y tipo durante AGRUPAR_MS y envía un solo mensaje por grupo.
const pendientes = new Map();
function encolar(app, tipo, detalle) {
  const clave = `${app}|${tipo}`;
  if (!pendientes.has(clave)) {
    pendientes.set(clave, []);
    setTimeout(() => {
      const items = pendientes.get(clave);
      pendientes.delete(clave);
      enviar(mensaje(app, tipo, items));
    }, AGRUPAR_MS);
  }
  pendientes.get(clave).push(detalle);
}

function mensaje(app, tipo, items) {
  const cuando = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const n = new Set(items.map(i => i.id)).size; // instancias distintas del clúster, no eventos
  const instancias = `${n} instancia${n === 1 ? '' : 's'}`;
  if (tipo === 'manual') return `🔴 **${app}** detenida manualmente (${instancias}) en ${os.hostname()} · ${cuando}`;
  if (tipo === 'caida') {
    const codigos = [...new Set(items.map(i => i.codigo))].join(', ');
    return `🔴 **${app}** se cayó (${instancias}, código de salida ${codigos}) en ${os.hostname()} · ${cuando}\nPM2 la está reiniciando.`;
  }
  return `🟢 **${app}** volvió a estar en línea (${instancias}) en ${os.hostname()} · ${cuando}`;
}

const caidas = new Set(); // apps detenidas o caídas: su siguiente "online" se reporta como recuperación

// Secuencia de PM2 (verificada con su bus): al detener a mano emite "exit" y enseguida "stop" (manually = true) por
// cada instancia; en una caída solo emite "exit" y luego "online" al reiniciarla. Por eso cada "exit" espera
// ESPERA_STOP_MS: si llega el "stop" de esa instancia es una detención manual; si no, es una caída. En una recarga
// en caliente (pm2 reload, la usa cada despliegue) las instancias viejas salen como "_old_<id>": no es una caída.
const ESPERA_STOP_MS = 1000;
const salidas = new Map(); // pm_id -> temporizador del "exit" pendiente de clasificar
pm2.connect(err => {
  if (err) { console.error(err); process.exit(1); }
  pm2.launchBus((err2, bus) => {
    if (err2) { console.error(err2); process.exit(1); }
    console.log(`Vigilando ${VIGILAR.length ? VIGILAR.join(', ') : 'todas las apps'} · webhook de ${esSlack ? 'Slack' : 'Discord'}`);
    bus.on('process:event', packet => {
      const p = packet.process || {};
      const app = p.name;
      if (!app || app === SELF || (VIGILAR.length && !VIGILAR.includes(app))) return;
      if (packet.event === 'stop') {
        clearTimeout(salidas.get(p.pm_id));
        salidas.delete(p.pm_id);
        caidas.add(app);
        encolar(app, 'manual', { id: p.pm_id });
      } else if (packet.event === 'exit' && p.status !== 'stopping' && !String(p.pm_id).startsWith('_old_') && !salidas.has(p.pm_id)) {
        const codigo = p.exit_code ?? '?';
        salidas.set(p.pm_id, setTimeout(() => {
          salidas.delete(p.pm_id);
          caidas.add(app);
          encolar(app, 'caida', { id: p.pm_id, codigo });
        }, ESPERA_STOP_MS));
      } else if (packet.event === 'online') {
        // Tras una caída PM2 reinicia antes de que se clasifique el "exit": se revisa cuando ya está clasificado.
        setTimeout(() => {
          if (!caidas.has(app)) return;
          encolar(app, 'online', { id: p.pm_id });
          setTimeout(() => caidas.delete(app), AGRUPAR_MS); // las demás instancias entran en el mismo mensaje
        }, ESPERA_STOP_MS + 200);
      }
    });
  });
});
