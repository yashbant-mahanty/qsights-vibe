#!/bin/bash

###############################################################################
# QSights Production Backup and Rollback Script
# Date: February 14, 2026
# Purpose: Complete backup of database, backend, and frontend
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER_IP="13.126.210.220"
SERVER_USER="ubuntu"
BACKUP_BASE_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_BASE_DIR}/backup_${TIMESTAMP}"

# Server paths
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
FRONTEND_PATH="/var/www/frontend"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         QSights Production Backup & Rollback Tool            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Menu
echo "Select an option:"
echo "1) Create Full Backup (Database + Backend + Frontend)"
echo "2) Create Database Backup Only"
echo "3) Create Code Backup Only (Backend + Frontend)"
echo "4) List Available Backups"
echo "5) Rollback from Backup"
echo "6) Exit"
echo ""
read -p "Enter your choice [1-6]: " choice

case $choice in
    1)
        echo -e "${GREEN}Creating full backup...${NC}"
        mkdir -p "${BACKUP_DIR}"
        
        # Database Backup
        echo -e "${YELLOW}[1/3] Backing up PostgreSQL database...${NC}"
        ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
            cd $BACKEND_PATH &&
            php artisan config:cache > /dev/null 2>&1 &&
            DB_HOST=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.host\");' 2>/dev/null | tail -1) &&
            DB_PORT=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.port\");' 2>/dev/null | tail -1) &&
            DB_NAME=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.database\");' 2>/dev/null | tail -1) &&
            DB_USER=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.username\");' 2>/dev/null | tail -1) &&
            DB_PASS=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.password\");' 2>/dev/null | tail -1) &&
            echo \"Database: \$DB_NAME\" &&
            PGPASSWORD=\"\$DB_PASS\" pg_dump -h \"\$DB_HOST\" -p \"\$DB_PORT\" -U \"\$DB_USER\" -F c -b -v -f \"/tmp/db_backup_${TIMESTAMP}.dump\" \"\$DB_NAME\" 2>&1 | grep -v '^pg_dump: ' || true
        "
        
        scp -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP:/tmp/db_backup_${TIMESTAMP}.dump" "${BACKUP_DIR}/database.dump"
        ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "rm /tmp/db_backup_${TIMESTAMP}.dump"
        echo -e "${GREEN}✓ Database backup completed${NC}"
        
        # Backend Backup
        echo -e "${YELLOW}[2/3] Backing up backend code...${NC}"
        rsync -avz --exclude='node_modules' --exclude='vendor' --exclude='storage/logs/*' --exclude='storage/framework/cache/*' \
            -e "ssh -i $PEM_KEY" \
            "$SERVER_USER@$SERVER_IP:$BACKEND_PATH/" \
            "${BACKUP_DIR}/backend/" > /dev/null
        echo -e "${GREEN}✓ Backend backup completed${NC}"
        
        # Frontend Backup
        echo -e "${YELLOW}[3/3] Backing up frontend code...${NC}"
        rsync -avz --exclude='node_modules' --exclude='.next/cache' \
            -e "ssh -i $PEM_KEY" \
            "$SERVER_USER@$SERVER_IP:$FRONTEND_PATH/" \
            "${BACKUP_DIR}/frontend/" > /dev/null
        echo -e "${GREEN}✓ Frontend backup completed${NC}"
        
        # Create metadata
        cat > "${BACKUP_DIR}/backup_info.txt" << EOF
Backup Created: $(date)
Timestamp: ${TIMESTAMP}
Server: ${SERVER_IP}
Database: Included (PostgreSQL custom format)
Backend: Included
Frontend: Included
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
EOF
        
        echo ""
        echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║              BACKUP COMPLETED SUCCESSFULLY                   ║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
        echo -e "${BLUE}Backup Location: ${BACKUP_DIR}${NC}"
        echo -e "${BLUE}Backup Size: $(du -sh "${BACKUP_DIR}" | cut -f1)${NC}"
        ;;
        
    2)
        echo -e "${GREEN}Creating database backup...${NC}"
        mkdir -p "${BACKUP_DIR}"
        
        ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
            cd $BACKEND_PATH &&
            php artisan config:cache > /dev/null 2>&1 &&
            DB_HOST=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.host\");' 2>/dev/null | tail -1) &&
            DB_PORT=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.port\");' 2>/dev/null | tail -1) &&
            DB_NAME=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.database\");' 2>/dev/null | tail -1) &&
            DB_USER=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.username\");' 2>/dev/null | tail -1) &&
            DB_PASS=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.password\");' 2>/dev/null | tail -1) &&
            PGPASSWORD=\"\$DB_PASS\" pg_dump -h \"\$DB_HOST\" -p \"\$DB_PORT\" -U \"\$DB_USER\" -F c -b -v -f \"/tmp/db_backup_${TIMESTAMP}.dump\" \"\$DB_NAME\"
        "
        
        scp -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP:/tmp/db_backup_${TIMESTAMP}.dump" "${BACKUP_DIR}/database.dump"
        ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "rm /tmp/db_backup_${TIMESTAMP}.dump"
        
        echo -e "${GREEN}✓ Database backup completed: ${BACKUP_DIR}/database.dump${NC}"
        ;;
        
    3)
        echo -e "${GREEN}Creating code backup...${NC}"
        mkdir -p "${BACKUP_DIR}"
        
        rsync -avz --exclude='node_modules' --exclude='vendor' \
            -e "ssh -i $PEM_KEY" \
            "$SERVER_USER@$SERVER_IP:$BACKEND_PATH/" \
            "${BACKUP_DIR}/backend/"
            
        rsync -avz --exclude='node_modules' --exclude='.next/cache' \
            -e "ssh -i $PEM_KEY" \
            "$SERVER_USER@$SERVER_IP:$FRONTEND_PATH/" \
            "${BACKUP_DIR}/frontend/"
            
        echo -e "${GREEN}✓ Code backup completed: ${BACKUP_DIR}${NC}"
        ;;
        
    4)
        echo -e "${BLUE}Available Backups:${NC}"
        echo ""
        if [ -d "$BACKUP_BASE_DIR" ]; then
            ls -lht "$BACKUP_BASE_DIR" | grep "^d" | awk '{print $9, "(" $6, $7, $8 ")"}'
        else
            echo "No backups found"
        fi
        ;;
        
    5)
        echo -e "${YELLOW}Available backups:${NC}"
        if [ ! -d "$BACKUP_BASE_DIR" ]; then
            echo -e "${RED}No backups found${NC}"
            exit 1
        fi
        
        backups=($(ls -t "$BACKUP_BASE_DIR"))
        if [ ${#backups[@]} -eq 0 ]; then
            echo -e "${RED}No backups found${NC}"
            exit 1
        fi
        
        for i in "${!backups[@]}"; do
            echo "$((i+1))) ${backups[$i]}"
        done
        echo ""
        read -p "Select backup to restore [1-${#backups[@]}]: " backup_choice
        
        if [ "$backup_choice" -lt 1 ] || [ "$backup_choice" -gt ${#backups[@]} ]; then
            echo -e "${RED}Invalid choice${NC}"
            exit 1
        fi
        
        selected_backup="${BACKUP_BASE_DIR}/${backups[$((backup_choice-1))]}"
        
        echo ""
        echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║                    ⚠️  WARNING ⚠️                            ║${NC}"
        echo -e "${RED}║  This will OVERWRITE current production data with backup    ║${NC}"
        echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
        echo -e "${YELLOW}Backup to restore: ${selected_backup}${NC}"
        echo ""
        read -p "Type 'RESTORE' to confirm: " confirm
        
        if [ "$confirm" != "RESTORE" ]; then
            echo -e "${YELLOW}Rollback cancelled${NC}"
            exit 0
        fi
        
        echo ""
        echo -e "${GREEN}Starting rollback...${NC}"
        
        # Check what's in the backup
        if [ -f "${selected_backup}/database.dump" ]; then
            echo -e "${YELLOW}[1/3] Restoring database...${NC}"
            
            # Upload dump to server
            scp -i "$PEM_KEY" "${selected_backup}/database.dump" "$SERVER_USER@$SERVER_IP:/tmp/restore.dump"
            
            # Restore database
            ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
                cd $BACKEND_PATH &&
                php artisan config:cache > /dev/null 2>&1 &&
                DB_HOST=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.host\");' 2>/dev/null | tail -1) &&
                DB_PORT=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.port\");' 2>/dev/null | tail -1) &&
                DB_NAME=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.database\");' 2>/dev/null | tail -1) &&
                DB_USER=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.username\");' 2>/dev/null | tail -1) &&
                DB_PASS=\$(php artisan tinker --execute='echo config(\"database.connections.pgsql.password\");' 2>/dev/null | tail -1) &&
                PGPASSWORD=\"\$DB_PASS\" pg_restore -h \"\$DB_HOST\" -p \"\$DB_PORT\" -U \"\$DB_USER\" -d \"\$DB_NAME\" -c -v /tmp/restore.dump &&
                rm /tmp/restore.dump
            "
            echo -e "${GREEN}✓ Database restored${NC}"
        fi
        
        if [ -d "${selected_backup}/backend" ]; then
            echo -e "${YELLOW}[2/3] Restoring backend...${NC}"
            rsync -avz --delete --exclude='vendor' --exclude='storage/logs' \
                -e "ssh -i $PEM_KEY" \
                "${selected_backup}/backend/" \
                "$SERVER_USER@$SERVER_IP:$BACKEND_PATH/"
            ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "sudo systemctl restart php8.4-fpm"
            echo -e "${GREEN}✓ Backend restored${NC}"
        fi
        
        if [ -d "${selected_backup}/frontend" ]; then
            echo -e "${YELLOW}[3/3] Restoring frontend...${NC}"
            rsync -avz --delete --exclude='node_modules' \
                -e "ssh -i $PEM_KEY" \
                "${selected_backup}/frontend/" \
                "$SERVER_USER@$SERVER_IP:$FRONTEND_PATH/"
            ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "sudo -u ubuntu pm2 restart qsights-frontend"
            echo -e "${GREEN}✓ Frontend restored${NC}"
        fi
        
        echo ""
        echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║            ROLLBACK COMPLETED SUCCESSFULLY                   ║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
        ;;
        
    6)
        echo -e "${YELLOW}Exiting...${NC}"
        exit 0
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}Done!${NC}"
