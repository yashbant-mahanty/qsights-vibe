#!/bin/bash

###############################################################################
# QSights Pre-Prod Server Check and Start Script
# Purpose: Check if preprod server is running and start if needed
# Server: 3.110.94.207 (i-0b62d4d1009b83e2a)
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
SERVER_IP="3.110.94.207"
INSTANCE_ID="i-0b62d4d1009b83e2a"
REGION="ap-south-1"
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       QSights Pre-Prod Server Status Check                  ║${NC}"
echo -e "${BLUE}║       Server: $SERVER_IP (Mumbai)                    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check AWS CLI
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}✗ AWS CLI not found${NC}"
        echo -e "${YELLOW}Install with: brew install awscli${NC}"
        echo -e "${YELLOW}Then configure: aws configure${NC}"
        return 1
    fi
    echo -e "${GREEN}✓ AWS CLI found${NC}"
    return 0
}

# Function to check server connectivity
check_server() {
    echo -e "${YELLOW}[1/4] Checking Server Connectivity...${NC}"
    
    if ping -c 1 -W 2 "$SERVER_IP" &> /dev/null; then
        echo -e "${GREEN}✓ Server is responding to ping${NC}"
        return 0
    else
        echo -e "${RED}✗ Server is not responding${NC}"
        return 1
    fi
}

# Function to get EC2 instance status
get_instance_status() {
    echo -e "${YELLOW}[2/4] Checking EC2 Instance Status...${NC}"
    
    if ! check_aws_cli; then
        echo -e "${YELLOW}⚠ Cannot check EC2 status without AWS CLI${NC}"
        return 1
    fi
    
    STATUS=$(aws ec2 describe-instances \
        --instance-ids "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'Reservations[0].Instances[0].State.Name' \
        --output text 2>/dev/null || echo "unknown")
    
    echo -e "Instance Status: ${BLUE}$STATUS${NC}"
    
    if [ "$STATUS" == "running" ]; then
        echo -e "${GREEN}✓ EC2 instance is running${NC}"
        return 0
    elif [ "$STATUS" == "stopped" ]; then
        echo -e "${RED}✗ EC2 instance is stopped${NC}"
        return 1
    elif [ "$STATUS" == "stopping" ]; then
        echo -e "${YELLOW}⚠ EC2 instance is stopping${NC}"
        return 1
    elif [ "$STATUS" == "pending" ]; then
        echo -e "${YELLOW}⚠ EC2 instance is starting${NC}"
        return 2
    else
        echo -e "${RED}✗ Unknown instance status: $STATUS${NC}"
        return 1
    fi
}

# Function to start EC2 instance
start_instance() {
    echo -e "${YELLOW}[3/4] Starting EC2 Instance...${NC}"
    
    if ! check_aws_cli; then
        echo -e "${RED}Cannot start instance without AWS CLI${NC}"
        return 1
    fi
    
    read -p "Do you want to start the instance? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo -e "${YELLOW}Cancelled${NC}"
        return 1
    fi
    
    echo "Starting instance $INSTANCE_ID..."
    aws ec2 start-instances --instance-ids "$INSTANCE_ID" --region "$REGION"
    
    echo ""
    echo -e "${BLUE}Waiting for instance to start (this may take 1-2 minutes)...${NC}"
    
    # Wait up to 5 minutes for instance to start
    COUNTER=0
    MAX_ATTEMPTS=30
    
    while [ $COUNTER -lt $MAX_ATTEMPTS ]; do
        sleep 10
        ((COUNTER++))
        
        STATUS=$(aws ec2 describe-instances \
            --instance-ids "$INSTANCE_ID" \
            --region "$REGION" \
            --query 'Reservations[0].Instances[0].State.Name' \
            --output text)
        
        echo -e "Attempt $COUNTER/$MAX_ATTEMPTS - Status: ${BLUE}$STATUS${NC}"
        
        if [ "$STATUS" == "running" ]; then
            echo -e "${GREEN}✓ Instance is now running!${NC}"
            echo ""
            echo -e "${YELLOW}Waiting 30 seconds for services to initialize...${NC}"
            sleep 30
            return 0
        fi
    done
    
    echo -e "${RED}✗ Timeout waiting for instance to start${NC}"
    return 1
}

# Function to verify services
verify_services() {
    echo -e "${YELLOW}[4/4] Verifying Services on Server...${NC}"
    
    echo "Attempting SSH connection..."
    
    if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$PEM_KEY" ubuntu@"$SERVER_IP" "echo 'SSH connection successful'" 2>/dev/null; then
        echo -e "${GREEN}✓ SSH connection successful${NC}"
    else
        echo -e "${RED}✗ SSH connection failed${NC}"
        echo -e "${YELLOW}You may need to wait a bit longer for SSH to be available${NC}"
        return 1
    fi
    
    echo ""
    echo "Checking services..."
    ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$PEM_KEY" ubuntu@"$SERVER_IP" "
        echo -e '${BLUE}=== PM2 Processes ===${NC}'
        pm2 list || echo 'PM2 not running or not installed'
        echo ''
        echo -e '${BLUE}=== Nginx Status ===${NC}'
        sudo systemctl status nginx --no-pager | head -10 || echo 'Nginx not running'
        echo ''
        echo -e '${BLUE}=== Disk Usage ===${NC}'
        df -h / | tail -1
        echo ''
        echo -e '${BLUE}=== Memory Usage ===${NC}'
        free -h | grep Mem
    " || echo -e "${YELLOW}⚠ Could not retrieve all service information${NC}"
}

# Main execution
main() {
    if check_server; then
        echo ""
        verify_services
        echo ""
        echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                Server is UP and Running!                     ║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${BLUE}Next Steps:${NC}"
        echo "1. Test preprod site: https://preprod.qsights.com or http://$SERVER_IP"
        echo "2. Deploy backend: ./deploy_backend_preprod.sh"
        echo "3. Deploy frontend: ./deploy_frontend_preprod.sh"
        echo ""
        exit 0
    fi
    
    echo ""
    get_instance_status
    STATUS_CODE=$?
    
    if [ $STATUS_CODE -eq 0 ]; then
        # Instance is running but not responding
        echo ""
        echo -e "${YELLOW}Instance is running but server is not responding${NC}"
        echo -e "${YELLOW}This may indicate:${NC}"
        echo "  • Services not started properly"
        echo "  • Network/Security group issues"
        echo "  • Server is still initializing"
        echo ""
        
        read -p "Try to verify services anyway? (yes/no): " CONFIRM
        if [ "$CONFIRM" == "yes" ]; then
            verify_services
        fi
        
    elif [ $STATUS_CODE -eq 1 ]; then
        # Instance is stopped
        echo ""
        start_instance && {
            echo ""
            verify_services
            echo ""
            echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
            echo -e "${GREEN}║         Server Successfully Started and Verified!            ║${NC}"
            echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
            echo ""
            echo -e "${BLUE}Preprod Server Ready:${NC}"
            echo "  • URL: https://preprod.qsights.com"
            echo "  • IP:  http://$SERVER_IP"
            echo ""
            echo -e "${YELLOW}Important:${NC}"
            echo "  • Verify services are running properly"
            echo "  • Check PM2 processes: ssh and run 'pm2 list'"
            echo "  • Check Nginx: ssh and run 'sudo systemctl status nginx'"
            echo ""
        }
    elif [ $STATUS_CODE -eq 2 ]; then
        # Instance is starting
        echo ""
        echo -e "${BLUE}Instance is already starting. Waiting for it to be ready...${NC}"
        sleep 30
        verify_services
    fi
}

# Run main
main
