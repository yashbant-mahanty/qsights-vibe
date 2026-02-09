# 🚨 URGENT: Preprod Server Down - Need EC2 Access

**Date**: February 8, 2026  
**Issue**: Preprod server (3.110.94.207) is stopped and not accessible  
**Impact**: Cannot test changes before production deployment

---

## For Person with EC2 Access (Quick Fix)

**You need someone who can start EC2 instances. Please forward this to them:**

### Quick Start Instructions

```bash
# Option 1: Using the automated script (EASIEST)
./START_PREPROD_FOR_ADMIN.sh

# Option 2: Manual AWS CLI command
aws ec2 start-instances --instance-ids i-0b62d4d1009b83e2a --region ap-south-1
```

**That's it!** The instance will start and should be accessible in 2-3 minutes at http://3.110.94.207/

---

## Details for Admin

**Instance Info:**
- Instance ID: `i-0b62d4d1009b83e2a`
- Region: `ap-south-1` (Mumbai)
- Current State: **Stopped**
- Name: QSights PreProd

**AWS Console Link:**
https://ap-south-1.console.aws.amazon.com/ec2/home?region=ap-south-1#Instances:

**Actions:**
1. Find instance `i-0b62d4d1009b83e2a`
2. Click "Instance state" → "Start instance"
3. Wait 2-3 minutes
4. Verify: http://3.110.94.207/ loads

---

## After Instance Starts

Once running, I can connect via SSM and restore services:

```bash
# This will auto-fix everything
./fix_preprod_now.sh
```

---

## Prevention: Auto-Recovery Setup

To prevent this in the future, after starting the instance, run this ONCE:

```bash
# Connect via SSM
aws ssm start-session --target i-0b62d4d1009b83e2a \
    --document-name AWS-StartPortForwardingSession \
    --parameters "localPortNumber=1199,portNumber=22" \
    --region ap-south-1

# In another terminal, install auto-recovery
ssh -p 1199 ubuntu@localhost < ./install_auto_recovery.sh
```

This will:
- ✅ Auto-start Nginx on boot
- ✅ Auto-start PM2 processes on boot
- ✅ Self-heal if services crash
- ✅ Prevent future downtime

---

## Who Can Help?

Look for team members with these AWS permissions:
- `ec2:StartInstances`
- `ec2:DescribeInstances`

Common roles:
- AWS Admin
- DevOps Team
- Infrastructure Team
- Senior Developers with AWS access

---

## Why This Happened

The EC2 instance was **manually stopped** or **auto-stopped** (if using instance scheduler).

Possible causes:
1. Cost-saving measure (stopped overnight/weekends)
2. Manual stop by admin
3. AWS scheduled action
4. System maintenance

---

## Temporary Workaround

If you can't get EC2 access immediately, you can:

1. **Request AWS Console access** (read-only is enough to see status)
2. **Use AWS SSM** if you have those permissions
3. **Ask DevOps** to add you to EC2 users group
4. **Deploy directly to production** (NOT RECOMMENDED - risky!)

---

## Scripts Created

1. **START_PREPROD_FOR_ADMIN.sh** - For admin to start instance
2. **fix_preprod_now.sh** - Auto-fix services after start
3. **install_auto_recovery.sh** - Prevent future issues
4. **auto-recovery-script.sh** - The recovery script itself

---

## Contact

If urgent and nobody has access:
1. Check AWS Organization admin
2. Contact billing/account owner
3. Check #devops or #infrastructure Slack channels
4. Emergency: AWS Support (if you have support plan)

---

**Time to fix**: 5 minutes (once someone with access helps)
**Current blocker**: Need EC2 permissions to start instance

Forward `START_PREPROD_FOR_ADMIN.sh` to someone who can run it!
