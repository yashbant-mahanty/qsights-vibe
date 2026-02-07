# Evaluation Analytics - Quick Reference Guide

## 🚀 Quick Start

### Base URL
```
https://prod.qsights.com/api/evaluation/analytics
```

### Authentication
All requests require Bearer token in header:
```bash
Authorization: Bearer YOUR_AUTH_TOKEN
```

---

## 📊 Available Endpoints

### 1. SUMMARY (`/summary`)
**Get comprehensive analytics overview**

```bash
GET /summary?date_from=2026-01-01&date_to=2026-02-07
```

**Required Params:**
- `date_from` - Start date (YYYY-MM-DD)
- `date_to` - End date (YYYY-MM-DD)

**Optional Params:**
- `program_id` - Filter by program
- `department_id` - Filter by department
- `evaluator_id` - Filter by evaluator
- `template_id` - Filter by template

**Response:**
```json
{
  "success": true,
  "summary": {
    "total_metrics": {
      "evaluations_completed": 198,
      "completion_rate": 80.8,
      "overall_average_rating": 4.2
    }
  }
}
```

---

### 2. EVALUATOR PERFORMANCE (`/evaluator-performance`)
**Get individual evaluator statistics**

```bash
GET /evaluator-performance?date_from=2026-01-01&date_to=2026-02-07
```

**Response:**
```json
{
  "evaluator_performance": [
    {
      "evaluator_name": "John Manager",
      "total_completed": 12,
      "completion_rate": 80.0,
      "average_rating_given": 4.3
    }
  ]
}
```

---

### 3. SUBORDINATE PERFORMANCE (`/subordinate-performance`)
**Get individual staff performance**

```bash
GET /subordinate-performance?date_from=2026-01-01&date_to=2026-02-07
```

**Optional Param:**
- `staff_id` - Get specific staff only

**Response:**
```json
{
  "subordinate_performance": [
    {
      "staff_name": "Alice Developer",
      "overall_average_rating": 4.4,
      "highest_competency": {
        "name": "Technical Skills",
        "score": 4.8
      }
    }
  ]
}
```

---

### 4. COMPETENCY ANALYSIS (`/competency-analysis`)
**Get organization-wide skill analysis**

```bash
GET /competency-analysis?date_from=2026-01-01&date_to=2026-02-07
```

**Response:**
```json
{
  "competency_analysis": [
    {
      "competency": "Technical Proficiency",
      "average_score": 4.3,
      "department_breakdown": [
        {"department": "Engineering", "average_score": 4.5}
      ]
    }
  ]
}
```

---

### 5. DEPARTMENT COMPARISON (`/department-comparison`)
**Compare department performance**

```bash
GET /department-comparison?date_from=2026-01-01&date_to=2026-02-07
```

**Response:**
```json
{
  "department_comparison": [
    {
      "department": "Engineering",
      "completion_rate": 81.7,
      "average_rating": 4.3
    }
  ]
}
```

---

### 6. TRENDS (`/trends`)
**Get time-series data**

```bash
GET /trends?date_from=2026-01-01&date_to=2026-02-07&period=week
```

**Optional Param:**
- `period` - 'day', 'week', or 'month' (default: 'week')

**Response:**
```json
{
  "trends": [
    {
      "period": "2026-01-06",
      "completions": 15,
      "average_rating": 4.2
    }
  ]
}
```

---

## 🎯 Common Use Cases

### Monthly Report
```bash
# Get January 2026 analytics
curl -H "Authorization: Bearer TOKEN" \
  "https://prod.qsights.com/api/evaluation/analytics/summary?date_from=2026-01-01&date_to=2026-01-31"
```

### Department Deep-Dive
```bash
# Engineering department only
curl -H "Authorization: Bearer TOKEN" \
  "https://prod.qsights.com/api/evaluation/analytics/summary?date_from=2026-01-01&date_to=2026-02-07&department_id=Engineering"
```

### Individual Staff Report
```bash
# Specific staff member
curl -H "Authorization: Bearer TOKEN" \
  "https://prod.qsights.com/api/evaluation/analytics/subordinate-performance?date_from=2026-01-01&date_to=2026-02-07&staff_id=STAFF_UUID"
```

### Quarterly Trends
```bash
# Q1 2026 trends by month
curl -H "Authorization: Bearer TOKEN" \
  "https://prod.qsights.com/api/evaluation/analytics/trends?date_from=2026-01-01&date_to=2026-03-31&period=month"
```

---

## 📋 Date Range Presets

### This Month
```javascript
const today = new Date();
const dateFrom = new Date(today.getFullYear(), today.getMonth(), 1);
const dateTo = today;
// 2026-02-01 to 2026-02-07
```

### Last Month
```javascript
const today = new Date();
const dateFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);
const dateTo = new Date(today.getFullYear(), today.getMonth(), 0);
// 2026-01-01 to 2026-01-31
```

### This Quarter
```javascript
const today = new Date();
const quarter = Math.floor(today.getMonth() / 3);
const dateFrom = new Date(today.getFullYear(), quarter * 3, 1);
const dateTo = today;
// Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec
```

### This Year
```javascript
const today = new Date();
const dateFrom = new Date(today.getFullYear(), 0, 1);
const dateTo = today;
// 2026-01-01 to 2026-02-07
```

---

## 🔐 Authorization

**Allowed Roles:**
- `super-admin` - All programs
- `admin` - All programs
- `program-admin` - Their program only
- `evaluation-admin` - Their program only
- `moderator` - Their program only
- `evaluation_staff` - Their program only

**Program Filtering:**
- Super-admin: Can specify any `program_id` or omit for all programs
- Other roles: Automatically filtered to their assigned program

---

## ⚠️ Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 200 | Success | Data returned successfully |
| 401 | Unauthorized | Token missing/invalid - re-login |
| 403 | Forbidden | User doesn't have required role |
| 422 | Validation Error | Check date format or parameters |
| 500 | Server Error | Check Laravel logs |

---

## 🧪 Testing

### Get Your Token
1. Login to https://prod.qsights.com
2. Open DevTools (F12) → Application → Cookies
3. Copy `auth_token` value

### Test in Browser Console
```javascript
// Test summary endpoint
fetch('https://prod.qsights.com/api/evaluation/analytics/summary?date_from=2026-01-01&date_to=2026-02-07', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
})
.then(r => r.json())
.then(d => console.log(d));
```

### Test with cURL
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://prod.qsights.com/api/evaluation/analytics/summary?date_from=2026-01-01&date_to=2026-02-07" \
  | jq .
```

---

## 📊 Frontend Integration Example

```typescript
// React/Next.js example
import { fetchWithAuth } from '@/lib/api';

async function fetchAnalyticsSummary(dateFrom: string, dateTo: string) {
  try {
    const response = await fetchWithAuth(
      `/evaluation/analytics/summary?date_from=${dateFrom}&date_to=${dateTo}`
    );
    
    if (response.success) {
      const { summary } = response;
      console.log('Total Completed:', summary.total_metrics.evaluations_completed);
      console.log('Completion Rate:', summary.total_metrics.completion_rate + '%');
      console.log('Avg Rating:', summary.performance_metrics.overall_average_rating);
    }
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
  }
}
```

---

## 💡 Pro Tips

1. **Date Format:** Always use YYYY-MM-DD format
2. **Date Range:** End date must be >= start date
3. **Large Ranges:** Queries > 1 year may be slow, consider breaking up
4. **Caching:** Results don't change for completed dates, cache aggressively
5. **Filters:** Combine multiple filters for precise analysis
6. **Trends:** Use 'day' for last 30 days, 'week' for quarters, 'month' for years

---

## 📚 Full Documentation

- **Technical Spec:** `EVALUATION_REPORTING_ANALYTICS_ENHANCEMENT_FEB_07_2026.md`
- **API Docs:** `EVALUATION_ANALYTICS_BACKEND_DEPLOYMENT_FEB_07_2026.md`
- **Completion Report:** `PHASE_1_COMPLETE_ANALYTICS_BACKEND_FEB_07_2026.md`
- **Test Script:** `test_analytics_endpoints.sh`

---

**Last Updated:** February 7, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
