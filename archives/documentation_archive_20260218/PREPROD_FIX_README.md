# 🔧 QSights Pre-Prod Server - Quick Fix

**Issue**: Preprod server (3.110.94.207) is not working  
**Date**: February 8, 2026

## 🚀 Quick Solution (One Command)

```bash
./preprod_quick_start.sh
```

This will:
1. ✅ Check if server is running (start if needed)
2. ✅ Setup server configuration
3. ✅ Deploy backend
4. ✅ Deploy frontend
5. ✅ Verify everything works

**Time**: 5-10 minutes

---

## 📋 Manual Steps (if you prefer)

### Step 1: Start the Server
```bash
./check_and_start_preprod.sh
```

### Step 2: Setup Configuration
```bash
./setup_preprod_server.sh
```

### Step 3: Deploy
```bash
./deploy_backend_preprod.sh
./deploy_frontend_preprod.sh
```

---

## 🆘 Common Issues

### Server Not Responding
**Problem**: Cannot access 3.110.94.207  
**Solution**: EC2 instance is probably stopped
```bash
./check_and_start_preprod.sh
```
This will start the instance using AWS CLI.

### AWS CLI Not Installed
```bash
brew install awscli
aws configure
# Enter your AWS credentials
```

### SSH Connection Failed
```bash
chmod 400 /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem
```

### Site Shows 502 Error
**Problem**: Services not running  
**Solution**: SSH to server and check
```bash
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@3.110.94.207
pm2 list
sudo systemctl status nginx
```

---

## 📖 Complete Documentation

See [PREPROD_SETUP_GUIDE.md](PREPROD_SETUP_GUIDE.md) for:
- Detailed troubleshooting
- Architecture overview
- Monitoring commands
- Recovery procedures

---

## ✅ Verify It Works

After running the scripts:

```bash
# Open in browser
open http://3.110.94.207/

# Or test with curl
curl -I http://3.110.94.207/
```

Should see:
- ✅ Status 200 OK
- ✅ Login page loads
- ✅ Can navigate the site

---

## 📞 Quick Reference

| What | Command |
|------|---------|
| **One-click setup** | `./preprod_quick_start.sh` |
| **Check server status** | `./check_and_start_preprod.sh` |
| **Setup configuration** | `./setup_preprod_server.sh` |
| **Deploy backend** | `./deploy_backend_preprod.sh` |
| **Deploy frontend** | `./deploy_frontend_preprod.sh` |
| **SSH to server** | `ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@3.110.94.207` |

---

## 🎯 What Gets Fixed

✅ Directory structure created  
✅ Nginx configured and running  
✅ PM2 ecosystem setup  
✅ Backend deployed (Laravel API)  
✅ Frontend deployed (Next.js)  
✅ Logs configured  
✅ Backups enabled  
✅ Services auto-restart  

---

## 🔄 After Setup

**Test on Preprod**: http://3.110.94.207/  
**Monitor**: 24+ hours  
**Deploy to Prod**: If stable

```bash
./deploy_backend_prod.sh
./deploy_frontend_prod.sh
```

---

**Need Help?** See [PREPROD_SETUP_GUIDE.md](PREPROD_SETUP_GUIDE.md) for detailed troubleshooting.
