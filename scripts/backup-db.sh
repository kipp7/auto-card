#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)/backups}"
FILE_NAME="${2:-}"

ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/server/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-}"

if [[ -z "$DB_NAME" ]]; then
  echo "DB_NAME not set in .env" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

timestamp="$(date +"%Y%m%d-%H%M%S")"
file="${FILE_NAME:-auto-card-$timestamp.sql}"
output="$OUT_DIR/$file"

MYSQL_PWD="$DB_PASSWORD" mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --routines \
  --events \
  --default-character-set=utf8mb4 \
  "$DB_NAME" > "$output"

echo "Backup saved to $output"
