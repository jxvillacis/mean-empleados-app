# Publica el frontend (Angular SSR) en Azure App Service apuntando a la API desplegada en AWS.
# Uso (desde la raíz del repo, con az login hecho):
#   .\deploy\azure\publicar-frontend.ps1 -ApiUrl https://<ip-con-guiones>.sslip.io/api/v1
param(
  [Parameter(Mandatory)][string]$ApiUrl,
  [string]$ResourceGroup = 'rg-mean-empleados',
  [string]$WebApp = 'mean-empleados-jv'
)
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
if ($ApiUrl -notmatch '^https://') { throw 'La API debe ser https: el App Service sirve el frontend por https y el navegador bloquea llamadas http (contenido mixto).' }

# 1. URL de la API para producción (environment.prod.ts reemplaza a environment.ts en el build)
$envFile = Join-Path $root 'frontend\src\environments\environment.prod.ts'
$contenido = "// Producción: la API corre en AWS EC2 (Nginx + PM2) y el frontend en Azure App Service.`nexport const environment = {`n  production: true,`n  apiUrl: '$($ApiUrl.TrimEnd('/'))'`n};`n"
[IO.File]::WriteAllText($envFile, $contenido, (New-Object Text.UTF8Encoding($false)))

# 2. Build de producción con SSR
Push-Location (Join-Path $root 'frontend')
try { npx ng build; if ($LASTEXITCODE -ne 0) { throw 'Falló ng build' } } finally { Pop-Location }

# 3. ZIP con rutas "/" (Compress-Archive de PowerShell 5.1 usa "\" y Linux no lo extrae bien)
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$dist = Join-Path $root 'frontend\dist\frontend'
$zipPath = Join-Path $env:TEMP 'mean-frontend.zip'
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
$zip = [IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
  Get-ChildItem $dist -Recurse -File | Where-Object { $_.Name -ne '.deployment' } | ForEach-Object {
    $rel = $_.FullName.Substring($dist.Length + 1).Replace('\', '/')
    [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel, 'Optimal')
  }
} finally { $zip.Dispose() }

# 4. Despliegue: sin compilar en el servidor y con el arranque del servidor SSR
az webapp config appsettings set -g $ResourceGroup -n $WebApp --settings SCM_DO_BUILD_DURING_DEPLOYMENT=false -o none
az webapp config set -g $ResourceGroup -n $WebApp --startup-file 'node server/server.mjs' -o none
az webapp deploy -g $ResourceGroup -n $WebApp --src-path $zipPath --type zip --clean true --restart true
$hostName = az webapp show -g $ResourceGroup -n $WebApp --query defaultHostName -o tsv
Write-Host "Frontend publicado: https://$hostName  (API: $ApiUrl)"
Write-Host "Recuerda poner CORS_ORIGIN=https://$hostName en shared/backend.env de la EC2."
