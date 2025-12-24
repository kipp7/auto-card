param(
  [Parameter(Mandatory = $true)]
  [string]$File
)

if (-not (Test-Path $File)) {
  throw "Backup file not found: $File"
}

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

$passArg = if ($password) { "--password=$password" } else { '' }
$cmd = "mysql --host=$host --port=$port --user=$user $passArg $db < `"$File`""
cmd /c $cmd
Write-Host "Restore completed from $File"
