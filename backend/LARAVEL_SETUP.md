# QSights Laravel Backend - Setup Complete

## Project Details

- **Framework**: Laravel 11
- **Database**: PostgreSQL with UUID primary keys
- **Authentication**: Laravel Sanctum
- **Location**: `/Users/yash/Documents/Projects/Qsights2.0-Backend`

## Database Configuration

### PostgreSQL Settings
- **Host**: 127.0.0.1
- **Port**: 5432
- **Database**: qsights
- **Username**: postgres
- **Password**: (empty by default)

### UUID Support
All primary keys use UUID instead of auto-incrementing integers:
- Users table uses `uuid('id')->primary()`
- UUID generation via `HasUuids` trait in models

## User Model & Roles

### Available Roles
1. `super-admin` - Full system access
2. `admin` - Administrative access
3. `program-admin` - Program administration
4. `program-manager` - Program management
5. `program-moderator` - Program moderation
6. `participant` - Regular participant (default)

### User Model Fields
```php
- id (UUID, primary)
- name (string)
- email (string, unique)
- password (hashed)
- role (enum)
- organization_id (UUID, nullable)
- program_id (UUID, nullable)
- avatar (string, nullable)
- phone (string, nullable)
- status (enum: active/inactive, default: active)
- email_verified_at (timestamp, nullable)
- remember_token
- timestamps
```

### Super Admin Credentials
```
Email: superadmin@qsights.com
Password: SuperAdmin@123
```

## Middleware & Permissions

### CheckRole Middleware
Role-based access control middleware registered as `role`:

```php
// Protect routes by role
Route::middleware(['auth:sanctum', 'role:super-admin'])->group(function () {
    // Super admin only routes
});

Route::middleware(['auth:sanctum', 'role:super-admin,admin'])->group(function () {
    // Super admin and admin routes
});
```

### User Model Helper Methods
```php
$user->hasRole('super-admin');              // Check specific role
$user->hasAnyRole(['admin', 'super-admin']); // Check multiple roles
User::role('super-admin')->get();           // Query users by role
```

## Laravel Sanctum Configuration

### Token Management
- Sanctum installed and configured
- API token authentication ready
- Personal access tokens table migrated
- Stateful API enabled for SPA authentication

### Token Usage
```php
// Create token
$token = $user->createToken('token-name')->plainTextToken;

// Revoke token
$user->tokens()->delete();

// Protect API routes
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
```

## Running the Server

### Start Laravel Development Server
```bash
cd /Users/yash/Documents/Projects/Qsights2.0-Backend
php artisan serve
```

Server will run at: `http://localhost:8000`

### Useful Artisan Commands
```bash
# Run migrations
php artisan migrate

# Fresh migration with seeding
php artisan migrate:fresh --seed

# Create new migration
php artisan make:migration create_table_name

# Create new model
php artisan make:model ModelName -m

# Create controller
php artisan make:controller ControllerName

# Create middleware
php artisan make:middleware MiddlewareName

# Clear cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear
```

## API Routes

API routes are defined in `routes/api.php` with prefix `/api`.

Example:
```php
// routes/api.php
Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
});
```

Access: `http://localhost:8000/api/user`

## Database Migrations

### Created Tables
1. **users** - User authentication and profile (UUID primary key)
2. **password_reset_tokens** - Password reset functionality
3. **sessions** - Session management
4. **cache** - Cache storage
5. **jobs** - Queue jobs
6. **personal_access_tokens** - Sanctum tokens

### Migration Files Location
```
database/migrations/
├── 0001_01_01_000000_create_users_table.php (UUID support)
├── 0001_01_01_000001_create_cache_table.php
├── 0001_01_01_000002_create_jobs_table.php
└── 2025_12_02_103402_create_personal_access_tokens_table.php
```

## Seeders

### SuperAdminSeeder
Creates the initial Super Admin user:
- Located: `database/seeders/SuperAdminSeeder.php`
- Run: `php artisan db:seed --class=SuperAdminSeeder`
- Auto-runs with: `php artisan migrate:fresh --seed`

## Next Steps

### Integrate with Next.js Frontend
Update Next.js `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### CORS Configuration
Enable CORS for Next.js frontend (port 3000):
```bash
# Install CORS package if needed
composer require fruitcake/php-cors

# Already included in Laravel 11
```

Configure in `config/cors.php`:
```php
'paths' => ['api/*'],
'allowed_origins' => ['http://localhost:3000'],
'supports_credentials' => true,
```

## Project Structure

```
Qsights2.0-Backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   └── Middleware/
│   │       └── CheckRole.php (Role middleware)
│   └── Models/
│       └── User.php (UUID + Sanctum + Roles)
├── bootstrap/
│   └── app.php (Middleware registration)
├── config/
│   ├── sanctum.php (Sanctum config)
│   └── database.php (PostgreSQL config)
├── database/
│   ├── migrations/
│   └── seeders/
│       ├── DatabaseSeeder.php
│       └── SuperAdminSeeder.php
├── routes/
│   ├── api.php (API routes)
│   └── web.php (Web routes)
└── .env (PostgreSQL configuration)
```

## Testing Setup

### Test Super Admin Login
```bash
# Using curl
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@qsights.com","password":"SuperAdmin@123"}'
```

### Test Database Connection
```bash
php artisan tinker

> User::count()
=> 1

> User::first()->email
=> "superadmin@qsights.com"

> User::first()->role
=> "super-admin"
```

## Environment Variables

Key `.env` settings:
```env
APP_NAME=QSights
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=qsights
DB_USERNAME=postgres
DB_PASSWORD=
```

## Security Notes

⚠️ **Important for Production:**
- Change Super Admin password
- Set strong `APP_KEY`
- Configure proper database credentials
- Enable HTTPS
- Set `APP_DEBUG=false`
- Configure proper CORS origins
- Set up rate limiting
- Enable token expiration

---

## Status: ✅ CHUNK B2 Complete

All requirements implemented:
- ✅ Laravel 11 initialized
- ✅ PostgreSQL configured with UUID primary keys
- ✅ Sanctum installed and configured
- ✅ Role-based middleware (`CheckRole`)
- ✅ User model with role field and UUID
- ✅ Super Admin seeded (superadmin@qsights.com / SuperAdmin@123)

Ready for API endpoint development in next chunks!
