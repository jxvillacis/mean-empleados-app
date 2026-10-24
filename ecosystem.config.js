// PM2: procesos de producción del backend en AWS EC2 y despliegue automatizado desde GitHub (pm2 deploy).
// No contiene secretos: MONGO_URI, JWT_SECRET, CORS_ORIGIN y ALERT_WEBHOOK_URL viven solo en el servidor, en
// <APP_DIR>/shared/backend.env, que post-deploy enlaza como backend/.env.
//
// Desplegar desde la PC local (Git Bash), con los datos de tu instancia y tu repositorio:
//   export EC2_KEY=~/.ssh/mean-empleados.pem   (EC2_HOST y GITHUB_REPO permiten apuntar a otra instancia o repositorio)
//   pm2 deploy ecosystem.config.js production setup   # solo la primera vez: crea la estructura en el servidor
//   pm2 deploy ecosystem.config.js production         # cada vez: git pull, dependencias, build y reload sin caída
const path = require('path');

const APP_DIR = '/var/www/mean-empleados';
const LOG_DIR = process.env.LOG_DIR || path.join(APP_DIR, 'shared', 'logs');

module.exports = {
  apps: [
    {
      name: 'mean-api',
      cwd: path.join(__dirname, 'backend'),
      script: 'dist/index.js',
      instances: 'max',          // modo clúster: una instancia por vCPU de la EC2
      exec_mode: 'cluster',
      max_memory_restart: '300M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000                // solo escucha detrás de Nginx: el grupo de seguridad no abre el 3000
      },
      error_file: path.join(LOG_DIR, 'api-error.log'),
      out_file: path.join(LOG_DIR, 'api-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'mean-alertas',
      cwd: path.join(__dirname, 'deploy', 'pm2-alertas'),
      script: 'notificador.cjs',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        VIGILAR: 'mean-api',
        ALERTAS_ENV_FILE: path.join(APP_DIR, 'shared', 'backend.env')
      },
      error_file: path.join(LOG_DIR, 'alertas-error.log'),
      out_file: path.join(LOG_DIR, 'alertas-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: process.env.EC2_HOST || '34.239.85.180',
      key: process.env.EC2_KEY,
      ref: 'origin/practica-7-despliegue',
      repo: process.env.GITHUB_REPO || 'git@github.com:jxvillacis/mean-empleados-app.git',
      path: APP_DIR,
      ssh_options: 'StrictHostKeyChecking=accept-new',
      'post-deploy': 'bash deploy/post-deploy.sh'
    }
  }
};
