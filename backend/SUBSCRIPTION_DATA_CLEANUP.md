# Subscription Data Cleanup Guide

## Understanding the Current Data

The subscription metrics showing **₹1,30,560.00** in your dashboard are **REAL database values** from the `qsights` database, NOT mock data.

### Current Database Records

Your database has 5 activities with subscription data:

| Activity Name | Config Price | Subscription | Tax (18%) | Participants |
|---------------|--------------|--------------|-----------|--------------|
| Annual Employee Engagement Survey | ₹5,000 | ₹50,000 | ₹9,000 | 500 |
| Quarterly Customer Satisfaction Survey | ₹1,500 | ₹15,000 | ₹2,700 | 200 |
| Monthly Team Pulse Check | ₹500 | ₹5,000 | ₹900 | 100 |
| Weekly Project Feedback | ₹200 | ₹2,000 | ₹360 | 50 |
| Bi-Annual Performance Review | ₹3,000 | ₹30,000 | ₹5,400 | 300 |

### Total Calculation

```
Configuration Price:     ₹10,200.00
Subscription Revenue:    ₹1,02,000.00
Tax Amount (18%):        ₹18,360.00
─────────────────────────────────────
TOTAL REVENUE:          ₹1,30,560.00 ✓
```

## Data Source Confirmation

- **Database**: `qsights` (PostgreSQL)
- **Table**: `activities`
- **Fields**: `subscription_price`, `configuration_price`, `tax_percentage`, `subscription_frequency`, `number_of_participants`, `configuration_date`
- **API Endpoint**: `/api/dashboard/subscription-metrics`
- **Controller**: `App\Http\Controllers\Api\DashboardController@subscriptionMetrics`

## How to Clear This Data

You have **3 options** to clear the subscription data:

### Option 1: Using Laravel Artisan Command (Recommended) ⭐

```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0/backend

# Preview what will be cleared
php artisan subscription:clear

# Force clear without confirmation
php artisan subscription:clear --force
```

### Option 2: Using PHP Script

```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0/backend

php clear_subscription_data.php
```

### Option 3: Direct Database Query

```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0/backend

php artisan tinker
```

Then run:

```php
DB::table('activities')
    ->whereNotNull('subscription_price')
    ->update([
        'subscription_price' => null,
        'configuration_price' => null,
        'tax_percentage' => null,
        'subscription_frequency' => null,
        'number_of_participants' => null,
        'configuration_date' => null,
    ]);
```

## What Happens After Clearing

After running any of the above options:

1. ✅ All subscription-related fields will be set to `NULL` in the database
2. ✅ Dashboard will show **₹0.00** for all subscription metrics
3. ✅ Activity records remain intact (only pricing fields are cleared)
4. ✅ "No subscription data available yet" message will appear

### Dashboard Display After Cleanup

```
Total Revenue:        ₹0.00
Avg Subscription:     ₹0.00
Avg Tax Rate:         0.00%
Total Participants:   0

Message: "No subscription data available yet"
```

## Verifying the Cleanup

After clearing, verify with:

```bash
php artisan tinker --execute="
echo 'Activities with subscription data: ';
echo \App\Models\Activity::whereNotNull('subscription_price')->count();
"
```

Expected output: `0`

## Important Notes

⚠️ **This operation:**
- Does NOT delete activities (only clears pricing fields)
- Does NOT affect other activity data (questionnaires, responses, etc.)
- Does NOT require frontend code changes
- IS reversible (you can add new subscription data later)

✅ **Safe to run because:**
- Uses database transactions (rollback on error)
- Only affects subscription-related fields
- Asks for confirmation before executing
- Preserves all other activity information

## Frontend Code Status

The frontend code is **already correct** and uses real API data:

```tsx
// frontend/app/dashboard/page.tsx
{subscriptionMetrics.total_configuration_price + subscriptionMetrics.total_revenue_with_tax}
```

There is **NO mock data** in the frontend. All values come from the backend API which queries the real database.

## Data Flow

```
PostgreSQL Database (qsights)
    ↓
Activities Table (subscription_price, configuration_price, etc.)
    ↓
Laravel API (/api/dashboard/subscription-metrics)
    ↓
DashboardController@subscriptionMetrics
    ↓
Frontend React Component (app/dashboard/page.tsx)
    ↓
User Interface Display
```

## Testing After Cleanup

1. **Run the cleanup command**:
   ```bash
   php artisan subscription:clear --force
   ```

2. **Refresh the dashboard** in your browser

3. **Verify the display**:
   - All metric cards should show ₹0.00
   - "No subscription data available yet" message appears
   - No errors in browser console

4. **Check API response**:
   ```bash
   curl -X GET "http://localhost:8000/api/dashboard/subscription-metrics" \
        -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `php artisan subscription:clear` | Clear subscription data (with confirmation) |
| `php artisan subscription:clear --force` | Clear without confirmation |
| `php clear_subscription_data.php` | Alternative PHP script method |

## Need Help?

If you encounter any issues:

1. Check database connection: `php artisan tinker --execute="DB::connection()->getPdo();"`
2. Verify database name: `php artisan tinker --execute="echo config('database.connections.pgsql.database');"`
3. Check activities table: `php artisan tinker --execute="echo \App\Models\Activity::count();"`

---

**Last Updated**: December 15, 2025  
**Database**: qsights (PostgreSQL)  
**Framework**: Laravel 10 + Next.js 14
