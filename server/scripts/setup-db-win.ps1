param(
  [string]$DbHost = "127.0.0.1",
  [int]$DbPort = 3306,
  [string]$DbUser = "root",
  [string]$DbPassword = "",
  [string]$DbName = "auto_card",
  [switch]$InstallMySQL,
  [string]$MySQLServiceName = "MySQLAutoCard",
  [switch]$InstallMariaDB
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Set-OrAddEnvValue {
  param(
    [string]$Text,
    [string]$Key,
    [string]$Value
  )

  $escapedKey = [regex]::Escape($Key)
  $pattern = "(?m)^\s*$escapedKey\s*=.*$"
  if ($Text -match $pattern) {
    return [regex]::Replace($Text, $pattern, "$Key=$Value")
  }
  return ($Text.TrimEnd() + "`r`n$Key=$Value`r`n")
}

function To-MySqlPath {
  param([string]$Path)
  return $Path.Replace("\", "/")
}

function Escape-MySqlString {
  param([string]$Value)
  return $Value.Replace("'", "''")
}

function Require-Command {
  param([string]$Name)
  if (!(Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Command not found: $Name"
  }
}

function Find-MySQLServerExe {
  $candidates = @()
  foreach ($root in @("C:\\Program Files\\MySQL", "C:\\Program Files (x86)\\MySQL")) {
    if (Test-Path $root) {
      $candidates += Get-ChildItem -Path $root -Recurse -File -Filter "mysqld.exe" -ErrorAction SilentlyContinue
    }
  }

  if ($candidates.Count -gt 0) {
    $best = $candidates |
      Sort-Object -Property @{ Expression = { $_.VersionInfo.FileVersionRaw }; Descending = $true }, @{ Expression = { $_.LastWriteTime }; Descending = $true } |
      Select-Object -First 1
    return $best.FullName
  }

  $cmd = Get-Command "mysqld.exe" -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Path
  }

  throw "mysqld.exe not found. Install MySQL first (winget id: Oracle.MySQL) and try again."
}

function Wait-TcpPort {
  param(
    [string]$Host,
    [int]$Port,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      if (Test-NetConnection $Host -Port $Port -InformationLevel Quiet) {
        return $true
      }
    } catch {
      # ignore
    }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

function Test-MySQLAuth {
  param(
    [string]$MysqlExe,
    [string]$User,
    [string]$Host,
    [int]$Port,
    [string]$Password
  )

  $args = @("-u", $User, "-h", $Host, "-P", "$Port", "--protocol=tcp", "-e", "SELECT 1;")
  if ($Password -ne $null) {
    $args = @("--password=$Password") + $args
  }

  & $MysqlExe @args | Out-Null
  return $LASTEXITCODE -eq 0
}

if ($InstallMariaDB) {
  Write-Host "Installing MariaDB via winget..."
  Require-Command "winget"
  winget install -e --id MariaDB.Server --source winget --accept-source-agreements --accept-package-agreements --silent
  Write-Host "MariaDB install finished. Please ensure the MariaDB service is running."
}

if ($InstallMySQL) {
  if ([string]::IsNullOrEmpty($DbPassword)) {
    throw "When using -InstallMySQL, please provide -DbPassword (it will be used as the MySQL root password)."
  }

  Write-Host "Installing MySQL via winget..."
  Require-Command "winget"
  winget install -e --id Oracle.MySQL --source winget --accept-source-agreements --accept-package-agreements --silent

  $mysqldExe = Find-MySQLServerExe
  $mysqlBinDir = Split-Path -Path $mysqldExe -Parent
  $mysqlExe = Join-Path $mysqlBinDir "mysql.exe"
  if (!(Test-Path $mysqlExe)) {
    throw "mysql.exe not found next to mysqld.exe: $mysqlExe"
  }

  $mysqlRootDir = Split-Path -Path $mysqlBinDir -Parent
  $mysqlFolderName = Split-Path -Path $mysqlRootDir -Leaf

  $mysqlProgramDataDir = Join-Path "C:\\ProgramData\\MySQL" $mysqlFolderName
  $myIniPath = Join-Path $mysqlProgramDataDir "my.ini"
  $dataDir = Join-Path $mysqlProgramDataDir "Data"

  New-Item -ItemType Directory -Force -Path $mysqlProgramDataDir | Out-Null
  New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

  if (!(Test-Path $myIniPath)) {
    $basedir = To-MySqlPath $mysqlRootDir
    $datadir = To-MySqlPath $dataDir
    $ini = @"
[mysqld]
basedir=$basedir
datadir=$datadir
port=$DbPort
character-set-server=utf8mb4
collation-server=utf8mb4_0900_ai_ci
default_authentication_plugin=caching_sha2_password
"@
    Set-Content -LiteralPath $myIniPath -Value $ini -Encoding ASCII
    Write-Host "Created: $myIniPath"
  }

  $initialized = (Test-Path (Join-Path $dataDir "auto.cnf")) -or (Test-Path (Join-Path $dataDir "ibdata1"))
  if (!$initialized) {
    Write-Host "Initializing MySQL data directory..."
    & $mysqldExe "--defaults-file=$myIniPath" "--initialize-insecure" "--console" | Out-Host
  }

  $svc = Get-Service -Name $MySQLServiceName -ErrorAction SilentlyContinue
  if (!$svc) {
    Write-Host "Installing MySQL Windows service: $MySQLServiceName"
    & $mysqldExe "--defaults-file=$myIniPath" "--install" $MySQLServiceName | Out-Host
  }

  try {
    Set-Service -Name $MySQLServiceName -StartupType Automatic
  } catch {
    # ignore
  }

  $svc = Get-Service -Name $MySQLServiceName -ErrorAction SilentlyContinue
  if ($svc -and $svc.Status -ne "Running") {
    Write-Host "Starting MySQL service: $MySQLServiceName"
    Start-Service -Name $MySQLServiceName
  }

  if (!(Wait-TcpPort -Host $DbHost -Port $DbPort -TimeoutSeconds 60)) {
    throw "MySQL did not start listening on ${DbHost}:$DbPort (service: $MySQLServiceName)."
  }

  if (Test-MySQLAuth -MysqlExe $mysqlExe -User $DbUser -Host $DbHost -Port $DbPort -Password $null) {
    Write-Host "Setting MySQL password for user '$DbUser'..."
    $escaped = Escape-MySqlString $DbPassword
    $sql = "ALTER USER IF EXISTS '$DbUser'@'localhost' IDENTIFIED BY '$escaped';" +
      "ALTER USER IF EXISTS '$DbUser'@'127.0.0.1' IDENTIFIED BY '$escaped';" +
      "FLUSH PRIVILEGES;"
    & $mysqlExe -u $DbUser -h $DbHost -P "$DbPort" --protocol=tcp -e $sql | Out-Host
  }

  if (!(Test-MySQLAuth -MysqlExe $mysqlExe -User $DbUser -Host $DbHost -Port $DbPort -Password $DbPassword)) {
    throw "Unable to authenticate to MySQL as '$DbUser'. Please confirm -DbUser/-DbPassword and that MySQL is running."
  }

  Write-Host "MySQL is ready."
}

$serverDir = Resolve-Path (Join-Path $PSScriptRoot "..") | Select-Object -ExpandProperty Path
$envExamplePath = Join-Path $serverDir ".env.example"
$envPath = Join-Path $serverDir ".env"

if (!(Test-Path $envExamplePath)) {
  throw "Missing file: $envExamplePath"
}

if (!(Test-Path $envPath)) {
  Copy-Item -LiteralPath $envExamplePath -Destination $envPath
  Write-Host "Created: $envPath"
}

$content = Get-Content -LiteralPath $envPath -Raw -Encoding UTF8
$content = Set-OrAddEnvValue -Text $content -Key "DB_HOST" -Value $DbHost
$content = Set-OrAddEnvValue -Text $content -Key "DB_PORT" -Value $DbPort
$content = Set-OrAddEnvValue -Text $content -Key "DB_USER" -Value $DbUser
$content = Set-OrAddEnvValue -Text $content -Key "DB_PASSWORD" -Value $DbPassword
$content = Set-OrAddEnvValue -Text $content -Key "DB_NAME" -Value $DbName
Set-Content -LiteralPath $envPath -Value $content -Encoding UTF8

Push-Location $serverDir
try {
  Write-Host "Installing server dependencies..."
  npm.cmd install
  Write-Host "Initializing database..."
  npm.cmd run db:init
  Write-Host "Done."
} finally {
  Pop-Location
}
