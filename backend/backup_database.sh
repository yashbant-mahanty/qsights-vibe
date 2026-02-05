#!/bin/bash

##############################################################################
# Database Backup Script - Full PostgreSQL Backup
# 
# This script creates a complete backup of the QSights database before cleanup
# Date: February 5, 2026
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}QSights Database Backup Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Read database credentials from .env
DB_HOST=$(grep DB_HOST .env | cut -d '=' -f2)
DB_PORT=$(grep DB_PORT .env | cut -d '=' -f2)
DB_DATABASE=$(grep DB_DATABASE .env | cut -d '=' -f2)
DB_USERNAME=$(grep DB_USERNAME .env | cut -d '=' -f2)

echo -e "${YELLOW}Database:${NC} $DB_DATABASE"
echo -e "${YELLOW}Host:${NC} $DB_HOST"
echo ""

# Create backup directory
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/qsights_db_backup_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

echo -e "${YELLOW}Creating database backup...${NC}"
echo -e "${YELLOW}Backup file:${NC} $BACKUP_FILE_GZ"
echo ""

# Set PostgreSQL password (will prompt if not set)
export PGPASSWORD=$(grep DB_PASSWORD .env | cut -d '=' -f2)

# Create backup
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" \
    --format=plain \
    --no-owner \
    --no-acl \
    --verbose \
    --file="$BACKUP_FILE" 2>&1

if [ $? -eq 0 ]; then
    # Compress the backup
    echo ""
    echo -e "${YELLOW}Compressing backup...${NC}"
    gzip "$BACKUP_FILE"
    
    # Get file size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${YELLOW}File:${NC} $BACKUP_FILE_GZ"
    echo -e "${YELLOW}Size:${NC} $BACKUP_SIZE"
    echo ""
    
    # List recent backups
    echo -e "${YELLOW}Recent backups:${NC}"
    ls -lh $BACKUP_DIR/qsights_db_backup_*.sql.gz | tail -5
    echo ""
    
    # Cleanup old backups (keep last 10)
    echo -e "${YELLOW}Cleaning up old backups (keeping last 10)...${NC}"
    ls -t $BACKUP_DIR/qsights_db_backup_*.sql.gz | tail -n +11 | xargs -r rm
    echo ""
    
    echo -e "${GREEN}Backup ready! You can now proceed with cleanup.${NC}"
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ Backup failed!${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}Please check the error messages above.${NC}"
    exit 1
fi

unset PGPASSWORD
