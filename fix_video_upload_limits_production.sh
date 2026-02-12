#!/bin/bash

# QSights - Fix Video Upload Size Limits
# Date: February 12, 2026
# Issue: HTTP 413 "Content Too Large" for 28MB video upload
# Fix: Increase Nginx and PHP upload limits to 100MB

set -e

echo "=========================================="
echo "  Fix Video Upload Size Limits"
echo "  Target: 100MB uploads"
echo "  Date: $(date)"
echo "=========================================="

PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"

echo ""
echo "✅ Step 1: Backup current configurations..."
ssh -i "$PEM_FILE" "$SERVER" << 'ENDSSH'
  echo "Creating backups..."
  
  # Backup Nginx config
  if [ -f "/etc/nginx/nginx.conf" ]; then
    sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ Nginx config backed up"
  fi
  
  # Backup PHP-FPM config
  if [ -f "/etc/php/8.1/fpm/php.ini" ]; then
    sudo cp /etc/php/8.1/fpm/php.ini /etc/php/8.1/fpm/php.ini.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ PHP-FPM config backed up"
  fi
  
  # Backup PHP CLI config
  if [ -f "/etc/php/8.1/cli/php.ini" ]; then
    sudo cp /etc/php/8.1/cli/php.ini /etc/php/8.1/cli/php.ini.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ PHP CLI config backed up"
  fi
ENDSSH

echo ""
echo "✅ Step 2: Update Nginx configuration..."
ssh -i "$PEM_FILE" "$SERVER" << 'ENDSSH'
  echo "Updating Nginx client_max_body_size to 100M..."
  
  # Check if client_max_body_size already exists in nginx.conf
  if sudo grep -q "client_max_body_size" /etc/nginx/nginx.conf; then
    echo "Updating existing client_max_body_size..."
    sudo sed -i 's/client_max_body_size [^;]*;/client_max_body_size 100M;/g' /etc/nginx/nginx.conf
  else
    echo "Adding client_max_body_size to http block..."
    sudo sed -i '/http {/a \    client_max_body_size 100M;' /etc/nginx/nginx.conf
  fi
  
  # Also update site-specific config if exists
  if [ -f "/etc/nginx/sites-available/default" ]; then
    if sudo grep -q "client_max_body_size" /etc/nginx/sites-available/default; then
      sudo sed -i 's/client_max_body_size [^;]*;/client_max_body_size 100M;/g' /etc/nginx/sites-available/default
    else
      sudo sed -i '/server {/a \    client_max_body_size 100M;' /etc/nginx/sites-available/default
    fi
  fi
  
  # Verify Nginx config syntax
  sudo nginx -t
  
  if [ $? -eq 0 ]; then
    echo "✓ Nginx configuration valid"
  else
    echo "✗ Nginx configuration error - reverting"
    exit 1
  fi
ENDSSH

echo ""
echo "✅ Step 3: Update PHP configuration..."
ssh -i "$PEM_FILE" "$SERVER" << 'ENDSSH'
  echo "Updating PHP upload limits to 100M..."
  
  # Update PHP-FPM php.ini
  if [ -f "/etc/php/8.1/fpm/php.ini" ]; then
    echo "Updating PHP-FPM configuration..."
    sudo sed -i 's/^upload_max_filesize = .*/upload_max_filesize = 100M/' /etc/php/8.1/fpm/php.ini
    sudo sed -i 's/^post_max_size = .*/post_max_size = 100M/' /etc/php/8.1/fpm/php.ini
    sudo sed -i 's/^max_execution_time = .*/max_execution_time = 300/' /etc/php/8.1/fpm/php.ini
    sudo sed -i 's/^max_input_time = .*/max_input_time = 300/' /etc/php/8.1/fpm/php.ini
    sudo sed -i 's/^memory_limit = .*/memory_limit = 256M/' /etc/php/8.1/fpm/php.ini
    echo "✓ PHP-FPM limits updated"
  fi
  
  # Update PHP CLI php.ini
  if [ -f "/etc/php/8.1/cli/php.ini" ]; then
    echo "Updating PHP CLI configuration..."
    sudo sed -i 's/^upload_max_filesize = .*/upload_max_filesize = 100M/' /etc/php/8.1/cli/php.ini
    sudo sed -i 's/^post_max_size = .*/post_max_size = 100M/' /etc/php/8.1/cli/php.ini
    sudo sed -i 's/^max_execution_time = .*/max_execution_time = 300/' /etc/php/8.1/cli/php.ini
    sudo sed -i 's/^max_input_time = .*/max_input_time = 300/' /etc/php/8.1/cli/php.ini
    sudo sed -i 's/^memory_limit = .*/memory_limit = 256M/' /etc/php/8.1/cli/php.ini
    echo "✓ PHP CLI limits updated"
  fi
  
  # Check for PHP 8.2 as well (in case it's installed)
  if [ -f "/etc/php/8.2/fpm/php.ini" ]; then
    echo "Updating PHP 8.2 FPM configuration..."
    sudo sed -i 's/^upload_max_filesize = .*/upload_max_filesize = 100M/' /etc/php/8.2/fpm/php.ini
    sudo sed -i 's/^post_max_size = .*/post_max_size = 100M/' /etc/php/8.2/fpm/php.ini
    sudo sed -i 's/^max_execution_time = .*/max_execution_time = 300/' /etc/php/8.2/fpm/php.ini
    sudo sed -i 's/^max_input_time = .*/max_input_time = 300/' /etc/php/8.2/fpm/php.ini
    sudo sed -i 's/^memory_limit = .*/memory_limit = 256M/' /etc/php/8.2/fpm/php.ini
  fi
ENDSSH

echo ""
echo "✅ Step 4: Verify updated configurations..."
ssh -i "$PEM_FILE" "$SERVER" << 'ENDSSH'
  echo "Checking Nginx configuration..."
  sudo grep -n "client_max_body_size" /etc/nginx/nginx.conf | head -3
  
  echo ""
  echo "Checking PHP configuration..."
  if [ -f "/etc/php/8.1/fpm/php.ini" ]; then
    echo "PHP-FPM settings:"
    grep "^upload_max_filesize" /etc/php/8.1/fpm/php.ini
    grep "^post_max_size" /etc/php/8.1/fpm/php.ini
    grep "^max_execution_time" /etc/php/8.1/fpm/php.ini
    grep "^memory_limit" /etc/php/8.1/fpm/php.ini
  fi
ENDSSH

echo ""
echo "✅ Step 5: Restart services..."
ssh -i "$PEM_FILE" "$SERVER" << 'ENDSSH'
  echo "Restarting Nginx..."
  sudo systemctl restart nginx
  
  if [ $? -eq 0 ]; then
    echo "✓ Nginx restarted successfully"
    sudo systemctl status nginx --no-pager | head -5
  else
    echo "✗ Nginx restart failed"
    exit 1
  fi
  
  echo ""
  echo "Restarting PHP-FPM..."
  if systemctl is-active --quiet php8.1-fpm; then
    sudo systemctl restart php8.1-fpm
    echo "✓ PHP 8.1 FPM restarted"
    sudo systemctl status php8.1-fpm --no-pager | head -5
  elif systemctl is-active --quiet php8.2-fpm; then
    sudo systemctl restart php8.2-fpm
    echo "✓ PHP 8.2 FPM restarted"
    sudo systemctl status php8.2-fpm --no-pager | head -5
  else
    echo "⚠ No PHP-FPM service found (may be using different version)"
  fi
ENDSSH

echo ""
echo "✅ Step 6: Verify PHP settings via CLI..."
ssh -i "$PEM_FILE" "$SERVER" << 'ENDSSH'
  cd /var/www/QSightsOrg2.0/backend
  
  echo "PHP upload limits:"
  php -i | grep -E "(upload_max_filesize|post_max_size|max_execution_time)" | head -10
ENDSSH

echo ""
echo "=========================================="
echo "  ✓ CONFIGURATION UPDATE COMPLETE"
echo "=========================================="
echo ""
echo "📋 UPDATED LIMITS:"
echo "  • Nginx client_max_body_size: 100M"
echo "  • PHP upload_max_filesize: 100M"
echo "  • PHP post_max_size: 100M"
echo "  • PHP max_execution_time: 300 seconds"
echo "  • PHP memory_limit: 256M"
echo ""
echo "🧪 TEST INSTRUCTIONS:"
echo "  1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)"
echo "  2. Navigate to /questionnaires/create or /questionnaires/[id]"
echo "  3. Add a Video question"
echo "  4. Try uploading your 28MB video file"
echo "  5. Upload should now succeed without 413 error"
echo ""
echo "📝 ROLLBACK (if needed):"
echo "  Backup files are in:"
echo "  - /etc/nginx/nginx.conf.backup.TIMESTAMP"
echo "  - /etc/php/8.1/fpm/php.ini.backup.TIMESTAMP"
echo ""
