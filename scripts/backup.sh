#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Backup automatizado do PostgreSQL — DeCasa OS
# ============================================================
# Uso manual:      ./scripts/backup.sh
# Uso agendado:     crontab -e
#                    0 3 * * * /caminho/para/decasa-os/scripts/backup.sh
#
# Mantém os últimos 30 backups diários e envia para S3/R2 se configurado
# (opcional — deixa de enviar para nuvem se as variáveis não existirem).
# ============================================================

DATA=$(date +%Y-%m-%d_%H%M)
PASTA_BACKUP="${BACKUP_DIR:-./backups}"
ARQUIVO="$PASTA_BACKUP/decasa_os_$DATA.sql.gz"

mkdir -p "$PASTA_BACKUP"

echo "Gerando backup em $ARQUIVO..."
pg_dump "$DATABASE_URL" | gzip > "$ARQUIVO"

echo "Backup criado: $(du -h "$ARQUIVO" | cut -f1)"

# Envia para storage externo (S3/R2), se configurado
if [ -n "${S3_BUCKET:-}" ]; then
  echo "Enviando backup para $S3_BUCKET..."
  aws s3 cp "$ARQUIVO" "s3://$S3_BUCKET/backups/" --endpoint-url "${S3_ENDPOINT:-}"
fi

# Mantém apenas os últimos 30 backups locais
echo "Limpando backups locais com mais de 30 dias..."
find "$PASTA_BACKUP" -name "decasa_os_*.sql.gz" -mtime +30 -delete

echo "Backup concluído."
