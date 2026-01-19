# Start SSH Tunnel Before Deployment

## Prerequisites

Before running the deployment script, you need to start the AWS SSM port forwarding session:

```bash
aws ssm start-session \
  --target i-0de19fdf0bd6568b5 \
  --document-name AWS-StartPortForwardingSession \
  --parameters "localPortNumber=3389,portNumber=22" \
  --region ap-south-1
```

**Keep this terminal window open** - the tunnel must remain active during deployment.

## Then Run Deployment

In a **new terminal window**, run:

```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0
./deploy_program_name_fix.sh
```

## What the Deployment Does

1. ✅ Deploys backend ActivityController.php to `/var/www/QSightsOrg2.0/backend/`
2. ✅ Clears Laravel cache (config, cache, route, view)
3. ✅ Restarts PHP-FPM
4. ✅ Deploys frontend page.tsx to `/var/www/QSightsOrg2.0/frontend/`
5. ✅ Builds frontend on production (ensures no localhost:8000 in build)
6. ✅ Clears Next.js cache
7. ✅ Restarts PM2
8. ✅ Verifies services are running

## Changes Being Deployed

- **Backend:** ActivityController now adds `program_name` field to activity data
- **Frontend:** Reports & Analytics Event Summary table displays program names instead of UUIDs
