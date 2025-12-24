param(
  [string]$OutDir = (Join-Path $PSScriptRoot '..' 'backups'),
  [string]$FileName = ''
)

$envFile = Join-Path $PSScriptRoot '..\server\.env'
if (-not (Test-Path $envFile)) {
  throw "Missing env file: $envFile"
}

function Get-EnvMap($filePath) {
  $map = @{}
  Get-Content $filePath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
    $map[$key] = $value
  }
  return $map
}

$cfg = Get-EnvMap $envFile
$host = if ($cfg.DB_HOST) { $cfg.DB_HOST } else { '127.0.0.1' }
$port = if ($cfg.DB_PORT) { $cfg.DB_PORT } else { '3306' }
$user = if ($cfg.DB_USER) { $cfg.DB_USER } else { 'root' }
$password = if ($cfg.DB_PASSWORD) { $cfg.DB_PASSWORD } else { '' }
$db = $cfg.DB_NAME
if (-not $db) { throw 'DB_NAME not set in .env' }

if (-not (Test-Path $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$file = if ($FileName) { $FileName } else { "auto-card-$timestamp.sql" }
$output = Join-Path $OutDir $file

$args = @(
  "--host=$host",
  "--port=$port",
  "--user=$user",
  "--single-transaction",
  "--routines",
  "--events",
  "--default-character-set=utf8mb4",
  "--result-file=$output",
  $db
)
if ($password) { $args = @("--password=$password") + $args }

& mysqldump @args
Write-Host "Backup saved to $output"
