#!/bin/bash

###############################################################################
# QSights Quick Backup Script
# Creates a timestamped full backup quickly
###############################################################################

set -e

PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER_IP="13.126.210.220"
SERVER_USER="ubuntu"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/backup_${TIMESTAMP}"

echo "🔒 Creating QSights backup at $(date)..."
echo ""

mkdir -p "${BACKUP_DIR}"

# Database
echo "[1/3] 📊 Backing up database..."
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    cd /var/www/QSightsOrg2.0/backend &&
    php artisan config:cache > /dev/null 2>&1 &&
    DB_HOST=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.host\");' 2>/dev/null | tail -1) &&
    DB_PORT=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.port\");' 2>/dev/null | tail -1) &&
    DB_NAME=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.database\");' 2>/dev/null | tail -1) &&
    DB_USER=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.username\");' 2>/dev/null | tail -1) &&
    DB_PASS=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.password\");' 2>/dev/null | tail -1) &&
    PGPASSWORD=\"\$DB_PASS\" pg_dump -h \"\$DB_HOST\" -p \"\$DB_PORT\" -U \"\$DB_USER\" -F c -b -v -f \"/tmp/db_backup_${TIMESTAMP}.dump\" \"\$DB_NAME\" 2>&1 | grep -v '^pg_dump: ' || true
" > /dev/null
scp -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP:/tmp/db_backup_${TIMESTAMP}.dump" "${BACKUP_DIR}/database.dump" > /dev/null 2>&1
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "rm /tmp/db_backup_${TIMESTAMP}.dump" > /dev/null 2>&1
echo "✓ Database backup completed"

# Backend
echo "[2/3] ⚙️  Backing up backend..."
rsync -az --exclude='node_modules' --exclude='vendor' --exclude='storage/logs/*' \
    -e "ssh -i $PEM_KEY" \
    "$SERVER_USER@$SERVER_IP:/var/www/QSightsOrg2.0/backend/" \
    "${BACKUP_DIR}/backend/" > /dev/null 2>&1
echo "✓ Backend backup completed"

# Frontend
echo "[3/3] 🎨 Backing up frontend..."
rsync -az --exclude='node_modules' --exclude='.next/cache' \
    -e "ssh -i $PEM_KEY" \
    "$SERVER_USER@$SERVER_IP:/var/www/frontend/" \
    "${BACKUP_DIR}/frontend/" > /dev/null 2>&1
echo "✓ Frontend backup completed"

# Metadata
cat > "${BACKUP_DIR}/backup_info.txt" << EOF
Backup Created: $(date)
Timestamp: ${TIMESTAMP}
Server: ${SERVER_IP}
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
EOF

echo ""
echo "✅ BACKUP COMPLETED SUCCESSFULLY"
echo "📁 Location: ${BACKUP_DIR}"
echo "💾 Size: $(du -sh "${BACKUP_DIR}" | cut -f1)"
echo ""
