#!/bin/bash

###############################################################################
# FOR WHOEVER HAS EC2 ACCESS - RUN THIS TO START PREPROD
# This person needs: EC2 start-instances permission
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Starting QSights Preprod EC2 Instance                    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

INSTANCE_ID="i-0b62d4d1009b83e2a"
REGION="ap-south-1"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not found. Install: brew install awscli${NC}"
    exit 1
fi

# Check credentials
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials not configured. Run: aws configure${NC}"
    exit 1
fi
echo -e "${GREEN}✓ AWS credentials OK${NC}"
echo ""

# Check current status
echo "Checking instance status..."
STATUS=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Reservations[0].Instances[0].State.Name' \
    --output text 2>&1)

if [[ $? -ne 0 ]]; then
    echo -e "${RED}Error checking instance status:${NC}"
    echo "$STATUS"
    echo ""
    echo -e "${YELLOW}You may not have EC2 permissions. Contact your AWS admin.${NC}"
    exit 1
fi

echo "Current status: $STATUS"
echo ""

if [[ "$STATUS" == "running" ]]; then
    echo -e "${GREEN}✓ Instance is already running!${NC}"
    echo ""
    echo "Getting public IP..."
    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    echo -e "${GREEN}Instance is accessible at: http://$PUBLIC_IP/${NC}"
    echo ""
    echo "Next step: Run the fix script:"
    echo "  ./fix_preprod_now.sh"
    exit 0
fi

if [[ "$STATUS" == "stopping" ]]; then
    echo -e "${YELLOW}Instance is stopping. Please wait for it to stop, then run this script again.${NC}"
    exit 1
fi

if [[ "$STATUS" == "pending" ]]; then
    echo -e "${YELLOW}Instance is already starting...${NC}"
    echo "Waiting for it to be running..."
fi

if [[ "$STATUS" == "stopped" ]] || [[ "$STATUS" == "pending" ]]; then
    if [[ "$STATUS" == "stopped" ]]; then
        echo -e "${YELLOW}Starting instance $INSTANCE_ID...${NC}"
        aws ec2 start-instances --instance-ids "$INSTANCE_ID" --region "$REGION"
        echo ""
    fi
    
    echo "Waiting for instance to start (this takes 1-2 minutes)..."
    echo ""
    
    # Wait for running state
    COUNTER=0
    MAX_WAIT=60  # 5 minutes max
    
    while [ $COUNTER -lt $MAX_WAIT ]; do
        sleep 5
        ((COUNTER++))
        
        STATUS=$(aws ec2 describe-instances \
            --instance-ids "$INSTANCE_ID" \
            --region "$REGION" \
            --query 'Reservations[0].Instances[0].State.Name' \
            --output text)
        
        echo "[$COUNTER/$MAX_WAIT] Status: $STATUS"
        
        if [[ "$STATUS" == "running" ]]; then
            echo ""
            echo -e "${GREEN}✓✓✓ Instance is now RUNNING! ✓✓✓${NC}"
            
            # Wait a bit more for system initialization
            echo ""
            echo "Waiting 30 seconds for system services to initialize..."
            sleep 30
            
            # Get public IP
            PUBLIC_IP=$(aws ec2 describe-instances \
                --instance-ids "$INSTANCE_ID" \
                --region "$REGION" \
                --query 'Reservations[0].Instances[0].PublicIpAddress' \
                --output text)
            
            echo ""
            echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
            echo -e "${GREEN}║              Preprod Instance Started!                       ║${NC}"
            echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
            echo ""
            echo -e "${BLUE}Instance Details:${NC}"
            echo "  Instance ID: $INSTANCE_ID"
            echo "  Public IP:   $PUBLIC_IP"
            echo "  Status:      Running ✓"
            echo "  URL:         http://$PUBLIC_IP/"
            echo ""
            echo -e "${YELLOW}Next Steps:${NC}"
            echo "1. Test site: curl -I http://$PUBLIC_IP/"
            echo "2. If site doesn't load, run: ./fix_preprod_now.sh"
            echo "3. Or give this info to the requester"
            echo ""
            
            # Quick connectivity test
            echo "Testing connectivity..."
            if curl -s -I --connect-timeout 5 http://$PUBLIC_IP/ | grep -q "HTTP"; then
                echo -e "${GREEN}✓ Site is responding!${NC}"
            else
                echo -e "${YELLOW}⚠ Site may need services restarted. Run: ./fix_preprod_now.sh${NC}"
            fi
            
            exit 0
        fi
    done
    
    echo -e "${RED}Timeout waiting for instance to start${NC}"
    exit 1
fi

echo -e "${RED}Unexpected instance state: $STATUS${NC}"
exit 1
