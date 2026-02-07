# Default Services for Program Moderators

## Overview
When a default program moderator is created, they are automatically assigned a specific set of services/permissions. Admin and Super-Admin can grant additional services if needed.

## Default Services for Each Role

### Program Moderator (Default)
When a program-moderator user is created, they get these default services:
- `dashboard` - View dashboard
- `activities-view` - View events/activities
- `reports-view` - View reports
- `reports-export` - Export reports

### Program Manager (Default)
- `dashboard` - View dashboard
- `activities-view` - View events
- `activities-create` - Create events
- `activities-edit` - Edit events
- `activities-send-notification` - Send notifications
- `activities-landing-config` - Configure landing pages
- `participants-view` - View participants
- `participants-edit` - Edit participants
- `reports-view` - View reports
- `reports-export` - Export reports

### Program Admin (Default)
- `dashboard` - View dashboard
- `activities-view` - View events
- `activities-create` - Create events
- `activities-edit` - Edit events
- `activities-delete` - Delete events
- `activities-send-notification` - Send notifications
- `activities-set-reminder` - Set reminders
- `activities-landing-config` - Configure landing pages
- `participants-view` - View participants
- `participants-create` - Create participants
- `participants-edit` - Edit participants
- `participants-delete` - Delete participants
- `reports-view` - View reports
- `reports-export` - Export reports

## Database Structure

### Migration
- **File**: `database/migrations/2026_01_21_000001_add_default_services_to_users.php`
- **Field**: `default_services` (JSON) in `users` table
- **Purpose**: Store allowed services for each user

### User Model
- **Field**: `default_services` (array)
- **Cast**: Automatically cast to/from JSON
- **Fillable**: Yes, can be set during user creation

## API Endpoints

### Get User Services
```http
GET /api/auth/me
Authorization: Bearer {token}
```

**Response:**
```json
{
  "user": {
    "userId": "uuid",
    "email": "moderator@example.com",
    "role": "program-moderator",
    "services": ["dashboard", "activities-view", "reports-view", "reports-export"],
    "defaultServices": ["dashboard", "activities-view", "reports-view", "reports-export"]
  }
}
```

### Update User Services (Admin/Super-Admin Only)
```http
PUT /api/programs/{programId}/users/{userId}/services
Authorization: Bearer {token}
Content-Type: application/json

{
  "services": [
    "dashboard",
    "activities-view",
    "activities-create",
    "reports-view",
    "reports-export"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "User services updated successfully",
  "data": {
    "user_id": "uuid",
    "name": "moderator@example.com",
    "role": "program-moderator",
    "services": ["dashboard", "activities-view", "activities-create", "reports-view", "reports-export"]
  }
}
```

## Available Services

| Service | Description |
|---------|-------------|
| `dashboard` | View dashboard page |
| `activities-view` | View events/activities list |
| `activities-create` | Create new events |
| `activities-edit` | Edit existing events |
| `activities-delete` | Delete events |
| `activities-send-notification` | Send notifications for events |
| `activities-set-reminder` | Set reminders for events |
| `activities-landing-config` | Configure event landing pages |
| `participants-view` | View participants |
| `participants-create` | Create new participants |
| `participants-edit` | Edit participants |
| `participants-delete` | Delete participants |
| `reports-view` | View reports |
| `reports-export` | Export reports |

## Frontend Implementation

The frontend checks these services to show/hide UI elements:

```typescript
// Example: Check if user can create activities
if (currentUser.services?.includes('activities-create')) {
  // Show "Create Event" button
}

// Example: Check if user can edit activities
if (currentUser.services?.includes('activities-edit')) {
  // Show edit icon
}
```

## How It Works

### 1. User Creation
When a program-moderator is created (via Program creation), the system:
1. Creates the user with `role = 'program-moderator'`
2. Automatically sets `default_services` to the moderator defaults
3. Returns credentials to the admin

### 2. Permission Checks
When a user logs in:
1. Frontend calls `/api/auth/me`
2. Backend returns user info including `services` array
3. Frontend checks `services` array to show/hide features

### 3. Granting Additional Services
Admin/Super-Admin can:
1. Call PUT `/api/programs/{id}/users/{userId}/services`
2. Provide new services array
3. System updates `default_services` field
4. User gets new permissions on next login/refresh

## Code References

### Backend
- **Migration**: `database/migrations/2026_01_21_000001_add_default_services_to_users.php`
- **Model**: `app/Models/User.php`
- **Controller**: `app/Http/Controllers/Api/ProgramController.php`
  - Method: `getDefaultServicesForRole()`
  - Method: `updateProgramUserServices()`
- **Auth**: `app/Http/Controllers/Api/AuthController.php`
  - Method: `me()` - Returns user services
- **Routes**: `routes/api.php`

### Frontend
- **Activities Page**: `app/activities/page.tsx`
  - Checks `currentUser.role !== 'program-moderator'` to hide actions
- **Permissions**: `lib/permissions.ts`
  - Defines role-based permissions

## Notes

1. **Default vs Custom**: Default services are set when user is created. Admin can override by calling the services update endpoint.

2. **Role vs Services**: 
   - `role` defines the user's role type
   - `default_services` defines what they can actually do
   - This allows flexible permission management

3. **Backwards Compatibility**: Existing users without `default_services` will continue to work. The system merges default role permissions with custom services.

4. **Security**: Only Super-Admin and Admin can modify user services. Program-Admin can manage program users but cannot change their services.
