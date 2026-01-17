# Frontend Integration Guide - Notification Template Manager

## 📦 Files Provided

Three complete React components ready to integrate:

1. **NotificationTemplateManager.jsx** - Main component (list view)
2. **NotificationTemplateEditor.jsx** - Rich editor modal
3. **NotificationTemplatePreview.jsx** - Preview modal

## 🚀 Installation Steps

### 1. Install Required Dependencies

```bash
cd /Users/yash/Documents/Projects/Qsights2.0
npm install react-quill @mui/material @mui/icons-material axios
```

### 2. Copy Component Files

Copy the three `.jsx` files from `FRONTEND_COMPONENTS/` to your React project:

```bash
# From your frontend project root
cp /path/to/backend/FRONTEND_COMPONENTS/*.jsx src/components/notifications/
```

### 3. Import CSS for React Quill

In your main `App.js` or `index.js`:

```javascript
import 'react-quill/dist/quill.snow.css';
```

## 🔧 Integration into Activity Page

### Option 1: Add as New Tab

```jsx
// In your ActivityDetail.jsx or ActivitySettings.jsx

import NotificationTemplateManager from './components/notifications/NotificationTemplateManager';

function ActivityDetail({ activityId }) {
  const [authToken, setAuthToken] = useState(localStorage.getItem('token'));

  return (
    <div>
      <Tabs>
        <Tab label="Overview" />
        <Tab label="Questions" />
        <Tab label="Participants" />
        <Tab label="Responses" />
        {/* NEW TAB */}
        <Tab label="Notifications" />
      </Tabs>

      <TabPanel value={tabValue} index={4}>
        <NotificationTemplateManager 
          activityId={activityId}
          authToken={authToken}
        />
      </TabPanel>
    </div>
  );
}
```

### Option 2: Add as Section in Settings

```jsx
// In ActivitySettings.jsx

import NotificationTemplateManager from './components/notifications/NotificationTemplateManager';

function ActivitySettings({ activity }) {
  return (
    <div>
      <h2>Activity Settings</h2>
      
      {/* Existing settings sections */}
      <Section title="General Settings">...</Section>
      <Section title="Registration">...</Section>
      
      {/* NEW SECTION */}
      <Section title="Notification Templates">
        <NotificationTemplateManager 
          activityId={activity.id}
          authToken={localStorage.getItem('token')}
        />
      </Section>
    </div>
  );
}
```

## ⚙️ Configuration

### Environment Variables

Add to your `.env` file:

```env
REACT_APP_API_URL=http://localhost:8000/api
```

### Authentication Token

The components expect an auth token. Make sure you're passing it:

```javascript
// Get from your auth context/store
const authToken = useAuth().token; // or localStorage.getItem('token')

<NotificationTemplateManager 
  activityId={activityId}
  authToken={authToken}
/>
```

## 📝 Component Props

### NotificationTemplateManager

```typescript
interface Props {
  activityId: string;      // UUID of the activity
  authToken: string;       // Bearer token for API auth
}
```

### NotificationTemplateEditor

```typescript
interface Props {
  open: boolean;
  template: NotificationTemplate;
  placeholders: Record<string, string>;
  activityId: string;
  authToken: string;
  onSave: (templateData: any) => Promise<void>;
  onClose: () => void;
}
```

### NotificationTemplatePreview

```typescript
interface Props {
  open: boolean;
  template: NotificationTemplate;
  type: string;
  activityId: string;
  authToken: string;
  onClose: () => void;
}
```

## 🎨 Customization

### Styling with MUI Theme

The components use Material-UI. Customize in your theme:

```javascript
// theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Your primary color
    },
  },
});
```

### Custom CSS Classes

Add custom styles in your CSS file:

```css
/* Custom styles for notification templates */
.notification-template-manager {
  padding: 20px;
}

.quill-editor {
  min-height: 300px;
}
```

## 🔌 API Integration

The components automatically call these API endpoints:

```
GET    /api/activities/{activityId}/notification-templates
POST   /api/activities/{activityId}/notification-templates
GET    /api/activities/{activityId}/notification-templates/type/{type}
POST   /api/activities/{activityId}/notification-templates/preview
DELETE /api/activities/{activityId}/notification-templates/{templateId}
GET    /api/notification-templates/types
GET    /api/notification-templates/placeholders
```

Make sure your axios instance includes the auth header:

```javascript
// axios-config.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

## 📱 Responsive Design

The components are responsive and work on:
- ✅ Desktop (optimal)
- ✅ Tablet (good)
- ✅ Mobile (basic)

For better mobile UX, consider:

```jsx
import { useMediaQuery } from '@mui/material';

function ActivityDetail() {
  const isMobile = useMediaQuery('(max-width:600px)');

  return (
    <NotificationTemplateManager 
      activityId={activityId}
      authToken={authToken}
      // Pass mobile flag for responsive rendering
      isMobile={isMobile}
    />
  );
}
```

## 🧪 Testing

### Test in Development

1. Start backend: `php artisan serve`
2. Start frontend: `npm start`
3. Navigate to Activity → Notifications tab
4. Try creating/editing templates

### Test API Integration

```javascript
// Test script - can run in browser console
const testAPI = async () => {
  const token = 'your-token-here';
  const activityId = 'your-activity-id';
  
  const response = await fetch(
    `http://localhost:8000/api/activities/${activityId}/notification-templates`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  console.log(await response.json());
};

testAPI();
```

## 🐛 Troubleshooting

### CORS Issues

If you get CORS errors, update your Laravel backend `config/cors.php`:

```php
'paths' => ['api/*'],
'allowed_origins' => ['http://localhost:3000'],
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
```

### Auth Token Issues

Make sure token is stored and passed correctly:

```javascript
// Check token exists
const token = localStorage.getItem('token');
console.log('Token:', token ? 'exists' : 'missing');
```

### Component Not Rendering

Check console for errors and verify:
1. Dependencies installed
2. Components imported correctly
3. activityId is valid UUID
4. authToken is valid

## 📚 Additional Features (Optional)

### Send Test Email

Add a button to send test email:

```jsx
<Button onClick={async () => {
  await axios.post(
    `/api/activities/${activityId}/send-test-notification`,
    { notification_type: 'invitation', email: 'test@example.com' },
    { headers: { Authorization: `Bearer ${authToken}` }}
  );
  alert('Test email sent!');
}}>
  Send Test Email
</Button>
```

### Template History/Versioning

Track changes by adding version field:

```jsx
<Typography variant="caption">
  Last updated: {new Date(template.updated_at).toLocaleString()}
</Typography>
```

### Bulk Template Management

Create all defaults at once:

```jsx
<Button onClick={async () => {
  await axios.post(
    `/api/activities/${activityId}/notification-templates/create-defaults`,
    {},
    { headers: { Authorization: `Bearer ${authToken}` }}
  );
  fetchTemplates();
}}>
  Create All Default Templates
</Button>
```

## ✅ Checklist

- [ ] Dependencies installed
- [ ] Components copied to project
- [ ] Environment variables configured
- [ ] Auth token integration working
- [ ] Components imported in Activity page
- [ ] Backend server running
- [ ] Frontend server running
- [ ] Test create/edit/delete flow
- [ ] Test preview functionality
- [ ] Test placeholder insertion

## 🎉 You're Done!

The notification template manager is now integrated into your frontend. Admins can:
- ✅ View all notification types
- ✅ Create custom templates
- ✅ Edit existing templates
- ✅ Preview with sample data
- ✅ Delete templates (revert to default)
- ✅ Insert placeholders easily
- ✅ Toggle template active/inactive

---

**Need Help?** Check the backend documentation:
- `NOTIFICATION_TEMPLATE_MANAGER.md`
- `NOTIFICATION_TEMPLATES_QUICKSTART.md`
