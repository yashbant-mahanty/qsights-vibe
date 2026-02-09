# QSights Pre-Production Server Setup & Troubleshooting Guide

**Date**: February 8, 2026  
**Server**: 3.110.94.207 (i-0b62d4d1009b83e2a)  
**Region**: Mumbai (ap-south-1)  
**Purpose**: Complete guide to setup and fix preprod environment

---

## 🚨 Current Issue

**Problem**: Preprod server at https://3.110.94.207/ is not working  
**Expected**: Should work like Production (https://prod.qsights.com/)

### Quick Diagnosis
```bash
# Check if server is running
ping -c 3 3.110.94.207

# If no response, the EC2 instance might be stopped
```

---

## 🔧 Quick Fix Steps

### Step 1: Start the Server (if stopped)
```bash
./check_and_start_preprod.sh
```

This script will:
- ✅ Check if EC2 instance is running
- ✅ Start it if stopped (requires AWS CLI)
- ✅ Wait for services to initialize
- ✅ Verify PM2 and Nginx status

### Step 2: Setup/Verify Server Configuration
```bash
./setup_preprod_server.sh
```

This script will:
- ✅ Create proper directory structure
- ✅ Configure Nginx for preprod
- ✅ Setup PM2 ecosystem
- ✅ Configure logging
- ✅ Restart all services

### Step 3: Deploy Application
```bash
# Deploy backend
./deploy_backend_preprod.sh

# Deploy frontend
./deploy_frontend_preprod.sh
```

### Step 4: Verify
```bash
# Test the site
curl -I http://3.110.94.207/

# Or open in browser
open http://3.110.94.207/
```

---

## 📋 Complete Setup Process

### Prerequisites
- AWS CLI installed and configured (for EC2 management)
- PEM key at: `/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem`
- SSH access to server

### Installation Steps

#### 1. AWS CLI Setup (if needed)
```bash
# Install AWS CLI
brew install awscli

# Configure AWS credentials
aws configure
# Enter:
#   AWS Access Key ID
#   AWS Secret Access Key  
#   Default region: ap-south-1
#   Default output: json
```

#### 2. Verify PEM Key Permissions
```bash
chmod 400 /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem
```

#### 3. Check Server Status
```bash
./check_and_start_preprod.sh
```

**If EC2 is stopped**, the script will:
- Ask for confirmation to start
- Start the instance
- Wait for it to boot (1-2 minutes)
- Verify services

#### 4. Configure Server
```bash
./setup_preprod_server.sh
```

This creates:
- `/var/www/QSightsOrg2.0/backend` - Backend code
- `/var/www/frontend` - Frontend code
- `/home/ubuntu/backups/preprod` - Backups
- `/var/log/qsights/preprod` - Logs
- `/etc/nginx/sites-available/preprod.qsights.com` - Nginx config

#### 5. Deploy Code
```bash
# Backend (Laravel API)
./deploy_backend_preprod.sh

# Frontend (Next.js)
./deploy_frontend_preprod.sh
```

---

## 🏗️ Server Architecture

### Directory Structure
```
/var/www/
├── QSightsOrg2.0/
│   └── backend/          # Laravel backend
│       ├── app/
│       ├── routes/
│       └── .env          # Backend environment config
└── frontend/             # Next.js frontend
    ├── .next/            # Built files
    ├── pages/
    └── package.json

/home/ubuntu/
├── backups/
│   └── preprod/          # Deployment backups
└── ecosystem.preprod.config.js  # PM2 configuration

/var/log/qsights/preprod/ # Application logs
```

### Port Configuration
| Service | Port | Description |
|---------|------|-------------|
| Nginx | 80 | HTTP web server |
| Nginx | 443 | HTTPS (if SSL configured) |
| Frontend (PM2) | 3000 | Next.js app |
| Backend (PM2) | 1199 | Laravel API |

### Service Stack
```
┌─────────────────────────────────────────┐
│          Internet / Users               │
└──────────────┬──────────────────────────┘
               │ Port 80/443
┌──────────────▼──────────────────────────┐
│          Nginx (Reverse Proxy)          │
│  - Routes / → Frontend (port 3000)      │
│  - Routes /api → Backend (port 1199)    │
└──────────┬────────────────┬─────────────┘
           │                │
    ┌──────▼──────┐  ┌─────▼──────┐
    │  Frontend   │  │  Backend    │
    │  (Next.js)  │  │  (Laravel)  │
    │  PM2:3000   │  │  PM2:1199   │
    └─────────────┘  └──────┬──────┘
                            │
                     ┌──────▼──────┐
                     │  MySQL RDS  │
                     │  (Staging)  │
                     └─────────────┘
```

---

## 🔍 Troubleshooting

### Issue 1: Server Not Responding

**Symptoms**: Cannot ping or access server

**Diagnosis**:
```bash
# Check if server responds
ping -c 3 3.110.94.207

# If timeout, check EC2 status
aws ec2 describe-instances \
    --instance-ids i-0b62d4d1009b83e2a \
    --region ap-south-1 \
    --query 'Reservations[0].Instances[0].State.Name'
```

**Solutions**:
1. **Instance Stopped**: Run `./check_and_start_preprod.sh`
2. **Security Group**: Verify inbound rules allow:
   - Port 22 (SSH) from your IP
   - Port 80 (HTTP) from anywhere
   - Port 443 (HTTPS) from anywhere
3. **Network Issue**: Check AWS VPC/subnet configuration

---

### Issue 2: SSH Connection Fails

**Symptoms**: "Connection refused" or "Permission denied"

**Diagnosis**:
```bash
# Test SSH
ssh -vvv -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@3.110.94.207
```

**Solutions**:
1. **PEM permissions**: `chmod 400 /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem`
2. **Wrong user**: Make sure using `ubuntu` (not `ec2-user`)
3. **Security group**: Add your IP to allow SSH (port 22)
4. **Instance not ready**: Wait 1-2 minutes after starting instance

---

### Issue 3: Nginx Not Running

**Symptoms**: "502 Bad Gateway" or nginx not responding

**Diagnosis**:
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@3.110.94.207
sudo systemctl status nginx
sudo nginx -t
```

**Solutions**:
```bash
# Check configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

# Check logs
sudo tail -f /var/log/nginx/error.log

# If configuration error, run setup script
exit  # Exit SSH
./setup_preprod_server.sh
```

---

### Issue 4: PM2 Processes Not Running

**Symptoms**: Application not responding, 502 errors

**Diagnosis**:
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@3.110.94.207
pm2 list
pm2 logs
```

**Solutions**:
```bash
# If no processes running
cd /var/www/frontend
pm2 start npm --name qsights-frontend-preprod -- start

# Check backend
cd /var/www/QSightsOrg2.0/backend
pm2 start "php artisan serve --host=0.0.0.0 --port=1199" --name qsights-backend-preprod

# Save PM2 configuration
pm2 save
pm2 startup

# Or use ecosystem file
pm2 start /home/ubuntu/ecosystem.preprod.config.js
```

---

### Issue 5: Application Errors

**Symptoms**: 500 errors, white pages, API failures

**Diagnosis**:
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@3.110.94.207

# Check PM2 logs
pm2 logs qsights-frontend-preprod --lines 50
pm2 logs qsights-backend-preprod --lines 50

# Check application logs
tail -f /var/log/qsights/preprod/frontend-error.log
tail -f /var/log/qsights/preprod/backend-error.log

# Check Laravel logs
tail -f /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log
```

**Solutions**:
1. **Environment variables**: Check `.env` files are correct
2. **Database connection**: Verify RDS is accessible
3. **Dependencies**: Run `composer install` or `npm install`
4. **Permissions**: Check file permissions on backend storage
   ```bash
   sudo chown -R ubuntu:ubuntu /var/www/QSightsOrg2.0/backend/storage
   sudo chmod -R 775 /var/www/QSightsOrg2.0/backend/storage
   ```

---

### Issue 6: Site Accessible via IP but not Domain

**Symptoms**: http://3.110.94.207/ works but https://preprod.qsights.com doesn't

**Diagnosis**:
```bash
# Check DNS
nslookup preprod.qsights.com
dig preprod.qsights.com

# Should resolve to 3.110.94.207
```

**Solutions**:
1. **DNS not configured**: Add A record in DNS:
   - Type: A
   - Name: preprod
   - Value: 3.110.94.207
   - TTL: 3600

2. **SSL not configured**: Site may only work on HTTP for now
   ```bash
   # Access via HTTP
   http://preprod.qsights.com
   ```

3. **Setup SSL** (optional):
   ```bash
   ssh to server
   sudo apt update
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d preprod.qsights.com
   ```

---

## 🔐 Environment Configuration

### Backend (.env on server)
Located at: `/var/www/QSightsOrg2.0/backend/.env`

Key settings:
```env
APP_ENV=staging
APP_DEBUG=false
APP_URL=https://preprod.qsights.com

DB_HOST=qsights-preprod-db.c0vxik9s9ktk.ap-south-1.rds.amazonaws.com
DB_PORT=3306
DB_DATABASE=qsights_staging
DB_USERNAME=admin
DB_PASSWORD=<from .env.preprod>
```

### Frontend Environment
Built with:
```env
NEXT_PUBLIC_API_URL=https://preprod.qsights.com/api
NEXT_PUBLIC_APP_URL=https://preprod.qsights.com
NODE_ENV=production
```

---

## 📊 Monitoring & Maintenance

### Daily Checks
```bash
# Quick health check
./check_and_start_preprod.sh

# Or manually
curl -I http://3.110.94.207/health
```

### Check Logs
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@3.110.94.207

# PM2 logs
pm2 logs --lines 100

# Nginx access log
sudo tail -f /var/log/nginx/access.log

# Nginx error log
sudo tail -f /var/log/nginx/error.log

# System resources
htop  # or top
df -h  # Disk space
free -h  # Memory
```

### Restart Services
```bash
ssh to server

# Restart all
pm2 restart all
sudo systemctl restart nginx

# Restart specific service
pm2 restart qsights-frontend-preprod
pm2 restart qsights-backend-preprod
```

---

## 🚀 Deployment Workflow

### Proper Deployment Flow
```
Local Development
       ↓
  [Build & Test]
       ↓
Pre-Prod Deployment  ← YOU ARE HERE
       ↓
  [Test 24+ hours]
       ↓
Production Deployment
```

### Deploy to Preprod
```bash
# 1. Commit and push changes
git add .
git commit -m "Feature: Description"
git push

# 2. Deploy to preprod
./deploy_backend_preprod.sh    # If backend changes
./deploy_frontend_preprod.sh   # If frontend changes

# 3. Test thoroughly
open http://3.110.94.207/

# 4. Monitor for 24+ hours
# Check logs, test all features

# 5. If stable, deploy to production
./deploy_backend_prod.sh
./deploy_frontend_prod.sh
```

---

## 📝 Comparison: Preprod vs Production

| Aspect | Pre-Prod | Production |
|--------|----------|------------|
| **Server IP** | 3.110.94.207 | 13.126.210.220 |
| **Domain** | preprod.qsights.com | prod.qsights.com |
| **Instance** | i-0b62d4d1009b83e2a | i-075cf758a098b5e0e |
| **Database** | qsights-preprod-db | qsights-prod-db |
| **Backend Port** | 1199 | 1433 |
| **Frontend Port** | 3000 | 3000 |
| **Purpose** | Testing | Live users |
| **Uptime** | Can be stopped | Must be 24/7 |

### Key Differences
- ✅ Preprod can be stopped when not testing (saves costs)
- ✅ Preprod uses separate database (no prod data risk)
- ✅ Preprod allows testing risky changes safely
- ⚠️ Preprod should mirror production architecture

---

## 🔄 Recovery Procedures

### Rollback Deployment
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@3.110.94.207

# List backups
ls -lh /home/ubuntu/backups/preprod/

# Restore backend
cd /var/www/QSightsOrg2.0
sudo tar -xzf /home/ubuntu/backups/preprod/backend_TIMESTAMP.tar.gz

# Restore frontend
cd /var/www
sudo tar -xzf /home/ubuntu/backups/preprod/frontend_TIMESTAMP.tar.gz

# Restart services
pm2 restart all
```

### Full Server Reset
```bash
# If everything is broken, start fresh
./setup_preprod_server.sh

# Then deploy
./deploy_backend_preprod.sh
./deploy_frontend_preprod.sh
```

---

## 📞 Quick Reference Commands

### Server Management
```bash
# Start server (if stopped)
./check_and_start_preprod.sh

# Setup/fix configuration
./setup_preprod_server.sh

# SSH to server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@3.110.94.207
```

### Deployment
```bash
# Deploy backend
./deploy_backend_preprod.sh

# Deploy frontend
./deploy_frontend_preprod.sh

# Check deployment
curl -I http://3.110.94.207/
```

### Monitoring (on server)
```bash
# PM2 status
pm2 list
pm2 logs
pm2 monit

# Nginx status
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# System resources
df -h      # Disk
free -h    # Memory
top        # CPU/processes
```

### Service Control (on server)
```bash
# Restart all
pm2 restart all
sudo systemctl restart nginx

# Stop all
pm2 stop all
sudo systemctl stop nginx

# Start all
pm2 start all
sudo systemctl start nginx
```

---

## ✅ Post-Setup Checklist

After running setup scripts, verify:

- [ ] Server responds to ping
- [ ] SSH connection works
- [ ] Nginx is running: `sudo systemctl status nginx`
- [ ] Nginx config is valid: `sudo nginx -t`
- [ ] Directory structure exists: `ls -la /var/www/`
- [ ] PM2 is installed: `pm2 --version`
- [ ] Logs directory created: `ls -la /var/log/qsights/preprod/`
- [ ] Backup directory created: `ls -la /home/ubuntu/backups/preprod/`
- [ ] Can access via IP: `curl http://3.110.94.207/health`
- [ ] Backend deployed: `ls -la /var/www/QSightsOrg2.0/backend/`
- [ ] Frontend deployed: `ls -la /var/www/frontend/.next/`
- [ ] PM2 processes running: `pm2 list`
- [ ] No errors in logs: `pm2 logs --lines 20`

---

## 🆘 Emergency Contacts

If issues persist:

1. **Check AWS Console**:
   - EC2 Dashboard → Instances
   - Instance ID: i-0b62d4d1009b83e2a
   - Check: Status, Security Groups, System Log

2. **Check RDS**:
   - RDS Dashboard → Databases
   - Database: qsights-preprod-db
   - Verify: Status, Connectivity, Security Groups

3. **Review Scripts**:
   - `check_and_start_preprod.sh` - Server status
   - `setup_preprod_server.sh` - Configuration
   - `deploy_backend_preprod.sh` - Backend deployment
   - `deploy_frontend_preprod.sh` - Frontend deployment

---

## 📚 Additional Resources

- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Full deployment workflow
- [DEPLOYMENT_WORKFLOW_GUIDE.md](DEPLOYMENT_WORKFLOW_GUIDE.md) - Detailed deployment guide
- [.env.preprod](.env.preprod) - Environment configuration
- AWS EC2 Console: https://ap-south-1.console.aws.amazon.com/ec2/
- AWS RDS Console: https://ap-south-1.console.aws.amazon.com/rds/

---

**Last Updated**: February 8, 2026  
**Status**: Setup scripts created and ready to use
