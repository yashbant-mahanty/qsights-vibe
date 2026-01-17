#!/bin/bash

# Notification Template Manager - Frontend Integration Script
# Run this script to automatically integrate the notification template manager

set -e  # Exit on error

echo "🚀 Starting Notification Template Manager Integration..."
echo ""

# Configuration
FRONTEND_DIR="/Users/yash/Documents/Projects/Qsights2.0"
BACKEND_DIR="/Users/yash/Documents/Projects/Qsights2.0-Backend"
COMPONENTS_DIR="${FRONTEND_DIR}/src/components/notifications"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found: $FRONTEND_DIR${NC}"
    echo "Please update FRONTEND_DIR variable in this script."
    exit 1
fi

echo -e "${BLUE}Frontend directory: $FRONTEND_DIR${NC}"
echo ""

# Step 1: Create notifications directory
echo -e "${YELLOW}Step 1: Creating notifications directory...${NC}"
mkdir -p "$COMPONENTS_DIR"
echo -e "${GREEN}✅ Directory created: $COMPONENTS_DIR${NC}"
echo ""

# Step 2: Copy component files
echo -e "${YELLOW}Step 2: Copying React components...${NC}"
cp "${BACKEND_DIR}/FRONTEND_COMPONENTS/NotificationTemplateManager.jsx" "$COMPONENTS_DIR/"
cp "${BACKEND_DIR}/FRONTEND_COMPONENTS/NotificationTemplateEditor.jsx" "$COMPONENTS_DIR/"
cp "${BACKEND_DIR}/FRONTEND_COMPONENTS/NotificationTemplatePreview.jsx" "$COMPONENTS_DIR/"
echo -e "${GREEN}✅ Components copied:${NC}"
echo "   - NotificationTemplateManager.jsx"
echo "   - NotificationTemplateEditor.jsx"
echo "   - NotificationTemplatePreview.jsx"
echo ""

# Step 3: Check and install dependencies
echo -e "${YELLOW}Step 3: Checking dependencies...${NC}"
cd "$FRONTEND_DIR"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found in frontend directory${NC}"
    exit 1
fi

# Install dependencies
echo "Installing required packages..."
npm install react-quill @mui/material @mui/icons-material @emotion/react @emotion/styled axios

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Some dependencies may already be installed${NC}"
fi
echo ""

# Step 4: Add environment variable
echo -e "${YELLOW}Step 4: Configuring environment...${NC}"
ENV_FILE="${FRONTEND_DIR}/.env"

if [ -f "$ENV_FILE" ]; then
    # Check if API URL already exists
    if grep -q "REACT_APP_API_URL" "$ENV_FILE"; then
        echo -e "${BLUE}ℹ️  REACT_APP_API_URL already exists in .env${NC}"
    else
        echo "" >> "$ENV_FILE"
        echo "# Notification Template API" >> "$ENV_FILE"
        echo "REACT_APP_API_URL=http://localhost:8000/api" >> "$ENV_FILE"
        echo -e "${GREEN}✅ Added REACT_APP_API_URL to .env${NC}"
    fi
else
    # Create .env file
    echo "# Notification Template API" > "$ENV_FILE"
    echo "REACT_APP_API_URL=http://localhost:8000/api" >> "$ENV_FILE"
    echo -e "${GREEN}✅ Created .env with REACT_APP_API_URL${NC}"
fi
echo ""

# Step 5: Create integration helper file
echo -e "${YELLOW}Step 5: Creating integration helper...${NC}"
cat > "${COMPONENTS_DIR}/index.js" << 'EOF'
// Export all notification template components
export { default as NotificationTemplateManager } from './NotificationTemplateManager';
export { default as NotificationTemplateEditor } from './NotificationTemplateEditor';
export { default as NotificationTemplatePreview } from './NotificationTemplatePreview';
EOF
echo -e "${GREEN}✅ Created index.js for easy imports${NC}"
echo ""

# Step 6: Create integration guide
echo -e "${YELLOW}Step 6: Creating integration instructions...${NC}"
cat > "${COMPONENTS_DIR}/INTEGRATION_INSTRUCTIONS.md" << 'EOF'
# Integration Instructions

## Components Installed ✅

The notification template manager components have been installed in this directory.

## Next Steps

### 1. Import in Your Activity Page

Find your Activity detail or settings page (e.g., `src/pages/ActivityDetail.jsx`) and add:

```jsx
import { NotificationTemplateManager } from '../components/notifications';
```

### 2. Add to Activity Tabs

Add a new "Notifications" tab:

```jsx
import { NotificationTemplateManager } from '../components/notifications';

function ActivityDetail({ activity }) {
  const [tabValue, setTabValue] = useState(0);

  return (
    <div>
      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
        <Tab label="Overview" />
        <Tab label="Questions" />
        <Tab label="Participants" />
        <Tab label="Responses" />
        <Tab label="Notifications" /> {/* NEW */}
      </Tabs>

      {/* Existing tab panels */}
      
      {/* NEW: Notifications Tab Panel */}
      <TabPanel value={tabValue} index={4}>
        <NotificationTemplateManager 
          activityId={activity.id}
          authToken={localStorage.getItem('token')}
        />
      </TabPanel>
    </div>
  );
}
```

### 3. Import Quill CSS

In your main App.js or index.js, add:

```jsx
import 'react-quill/dist/quill.snow.css';
```

### 4. Verify Environment Variable

Check that `.env` contains:

```
REACT_APP_API_URL=http://localhost:8000/api
```

### 5. Test It!

1. Start backend: `cd ../Qsights2.0-Backend && php artisan serve`
2. Start frontend: `npm start`
3. Navigate to an activity and click the "Notifications" tab

## Files Installed

- `NotificationTemplateManager.jsx` - Main list component
- `NotificationTemplateEditor.jsx` - Rich editor modal
- `NotificationTemplatePreview.jsx` - Preview modal
- `index.js` - Export helper
- `INTEGRATION_INSTRUCTIONS.md` - This file

## Need Help?

See full documentation in backend:
- `FRONTEND_COMPONENTS/README.md`
- `FRONTEND_COMPONENTS/INTEGRATION_GUIDE.md`
- `NOTIFICATION_TEMPLATE_MANAGER.md`

## Example Usage

```jsx
// Minimal example
import { NotificationTemplateManager } from './components/notifications';

<NotificationTemplateManager 
  activityId="your-activity-uuid"
  authToken="your-bearer-token"
/>
```
EOF
echo -e "${GREEN}✅ Created INTEGRATION_INSTRUCTIONS.md${NC}"
echo ""

# Summary
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📁 Components installed in:${NC}"
echo "   $COMPONENTS_DIR"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "   1. Open: $COMPONENTS_DIR/INTEGRATION_INSTRUCTIONS.md"
echo "   2. Find your Activity detail page (e.g., src/pages/ActivityDetail.jsx)"
echo "   3. Add import: import { NotificationTemplateManager } from '../components/notifications';"
echo "   4. Add new 'Notifications' tab with the component"
echo "   5. Import Quill CSS in your App.js: import 'react-quill/dist/quill.snow.css';"
echo ""
echo -e "${BLUE}🧪 Test:${NC}"
echo "   cd $FRONTEND_DIR"
echo "   npm start"
echo ""
echo -e "${GREEN}🎉 Ready to integrate!${NC}"
echo ""
