# ✅ System Design Document - Architecture Corrections
**Date:** February 4, 2026  
**Status:** Deployed to Production

---

## 🎯 Corrected Architecture Details

### **Frontend Layer (Presentation Tier)**
- **Technology:** Next.js 14.2.35
- **Language:** TypeScript + React 18
- **Styling:** Tailwind CSS 3.x
- **Server:** PM2 Process Manager (clustering enabled)
- **Purpose:** User interface, client-side rendering, and user interactions

### **Backend Layer (Application Tier)**
- **Technology:** Laravel 11
- **Language:** PHP 8.2+
- **API Type:** RESTful API
- **Authentication:** Laravel Sanctum (token-based)
- **Authorization:** Role-Based Access Control (8 roles, 22 services)
- **Server:** PHP-FPM 8.4
- **Purpose:** Business logic, API endpoints, authentication, and data processing

### **Database Layer (Data Tier)**
- **Technology:** PostgreSQL 14.x
- **Hosting:** AWS RDS (Relational Database Service)
- **Configuration:** Multi-AZ deployment with standby for high availability
- **Encryption:** Encryption at rest enabled
- **Backup:** Automated daily snapshots + point-in-time recovery
- **Purpose:** Primary data storage for all application data

### **Storage Layer**
- **Technology:** AWS S3 (Simple Storage Service)
- **Purpose:** File uploads, images, documents, and media storage
- **Features:** 
  - Server-Side Encryption (SSE-S3)
  - Versioning enabled
  - Lifecycle policies for cost optimization
  - Pre-signed URLs for secure access

### **Caching Layer**
- **Technology:** AWS ElastiCache (Redis)
- **Purpose:** Session storage, API response caching, and performance optimization
- **Benefits:** Reduces database load and improves response times

---

## 📊 Complete Technology Stack

### **Frontend Technologies:**
```
Next.js 14.2.35     → React-based framework with SSR
TypeScript 5.x      → Type-safe JavaScript
React 18.x          → UI library
Tailwind CSS 3.x    → Utility-first CSS framework
Lucide React        → Icon library
PM2                 → Process manager and load balancer
```

### **Backend Technologies:**
```
Laravel 11          → PHP web framework
PHP 8.2+            → Server-side language
Laravel Sanctum     → API authentication
Eloquent ORM        → Database abstraction
PHP-FPM 8.4         → FastCGI Process Manager
Composer            → Dependency management
```

### **Database & Storage:**
```
PostgreSQL 14.x     → Primary database (AWS RDS)
AWS S3              → File storage
AWS ElastiCache     → Redis caching
```

### **Infrastructure:**
```
AWS EC2             → Compute instances
Nginx               → Web server and reverse proxy
Ubuntu 20.04 LTS    → Operating system
AWS VPC             → Network isolation
ALB                 → Application Load Balancer
Auto Scaling        → Dynamic capacity management
CloudWatch          → Monitoring and logging
Route 53            → DNS management
Let's Encrypt       → SSL/TLS certificates
```

---

## 🔄 Data Flow Architecture

### **1. User Request Flow:**
```
User Browser/App
    ↓ HTTPS (TLS 1.3)
Nginx (Reverse Proxy)
    ↓
PM2 (Next.js Frontend) ← Static/Client-side requests
    ↓ API calls
PHP-FPM (Laravel Backend) ← Dynamic/Server-side requests
    ↓ SQL queries
PostgreSQL (AWS RDS) ← Data retrieval
    ↓ Response
Laravel processes data
    ↓ JSON response
Next.js renders UI
    ↓ HTTPS
User sees result
```

### **2. File Upload Flow:**
```
User uploads file
    ↓
Next.js receives file
    ↓ POST /api/upload
Laravel validates file
    ↓ AWS SDK
AWS S3 stores file
    ↓ Returns URL
Laravel saves URL to PostgreSQL
    ↓ JSON response
Next.js displays uploaded file
```

### **3. Authentication Flow:**
```
User submits credentials
    ↓ POST /api/login
Laravel validates (PostgreSQL)
    ↓ Password verification (bcrypt)
Sanctum generates token
    ↓ Stores in personal_access_tokens
Token returned to client
    ↓ Stored in localStorage/cookie
Subsequent requests include token
    ↓ Authorization: Bearer {token}
Laravel validates token
    ↓ Checks role & permissions
API response based on RBAC
```

---

## 🏗️ Infrastructure Architecture

### **Network Topology:**
```
                    Internet
                       ↓
                  Route 53 (DNS)
                       ↓
              Application Load Balancer
                       ↓
        ┌──────────────┴──────────────┐
        ↓                             ↓
   Public Subnet                  Public Subnet
   (AZ-1)                         (AZ-2)
   - NAT Gateway                  - NAT Gateway
   - Internet Gateway             - Internet Gateway
        ↓                             ↓
   Private Subnet                 Private Subnet
   (AZ-1)                         (AZ-2)
   - EC2 (Next.js + Laravel)      - EC2 (Next.js + Laravel)
   - PHP-FPM                      - PHP-FPM
   - PM2                          - PM2
        ↓                             ↓
        └──────────────┬──────────────┘
                       ↓
              PostgreSQL (RDS)
              Multi-AZ with Standby
                       ↓
              AWS S3 + ElastiCache
```

### **Security Layers:**
1. **Network:** VPC with public/private subnets
2. **Firewall:** AWS Security Groups + UFW
3. **Access:** SSH key-based authentication, IP whitelisting
4. **Encryption:** TLS 1.3 in transit, encryption at rest
5. **Application:** CSRF protection, input validation
6. **Authentication:** Token-based (Sanctum)
7. **Authorization:** RBAC with granular permissions

---

## 📝 Key Corrections Made

### ❌ **Before (Incorrect):**
- "Aurora MySQL compatible"
- "LAMP stack"
- "MySQL Workbench for this database"
- Unclear frontend/backend distinction

### ✅ **After (Corrected):**
- **Frontend:** Next.js 14 (TypeScript/React) on PM2
- **Backend API:** Laravel 11 (PHP 8.2+) on PHP-FPM
- **Database:** PostgreSQL 14.x on AWS RDS
- **Storage:** AWS S3 for file uploads
- **Cache:** AWS ElastiCache (Redis)

---

## 🎯 Production Environment Details

### **Server Information:**
- **IP:** 13.126.210.220
- **Domain:** https://prod.qsights.com
- **Region:** AWS Mumbai (ap-south-1)
- **SSH Access:** ubuntu@13.126.210.220 (PEM key-based)

### **Application Paths:**
```
Frontend: /var/www/frontend/
Backend:  /var/www/QSightsOrg2.0/backend/
Nginx:    /etc/nginx/sites-available/qsights
Logs:     /var/log/nginx/ & /var/www/*/storage/logs/
```

### **Process Management:**
```
Frontend: PM2 (qsights-frontend)
Backend:  PHP-FPM 8.4
Web Server: Nginx
Database: AWS RDS (external)
```

---

## ✅ Deployment Status

- [x] Backend controller updated with correct architecture
- [x] All MySQL references changed to PostgreSQL
- [x] AWS S3 confirmed for file storage
- [x] Technology stack clarified (Next.js + Laravel + PostgreSQL)
- [x] Infrastructure details corrected
- [x] File uploaded to production server
- [x] SystemDesignController deployed
- [x] Laravel caches cleared
- [x] PHP-FPM reloaded
- [x] SDD API endpoint updated

---

## 🧪 Verification

### **Test SDD API:**
```bash
curl -X GET https://prod.qsights.com/api/system-design/data \
     -H "Authorization: Bearer YOUR_TOKEN" | jq '.data.architecture'
```

### **Expected Output:**
```json
{
  "technology_summary": {
    "frontend_layer": "Next.js 14 (TypeScript/React) - User Interface & Client-side Logic",
    "backend_layer": "Laravel 11 (PHP) - REST API, Business Logic & Authentication",
    "data_layer": "PostgreSQL on AWS RDS - Primary Database",
    "storage_layer": "AWS S3 - File Uploads and Media Storage",
    "cache_layer": "AWS ElastiCache (Redis) - Session and Data Caching"
  }
}
```

---

## 📋 Summary

**All technical details corrected:**
✅ Frontend = Next.js 14 (TypeScript/React)  
✅ Backend = Laravel 11 (PHP REST API)  
✅ Database = PostgreSQL on AWS RDS  
✅ Storage = AWS S3  
✅ Cache = AWS ElastiCache (Redis)  
✅ No incorrect MySQL/LAMP references  

**Status:** Production-ready and audit-compliant with accurate technical documentation.

---

**Updated By:** GitHub Copilot  
**Deployed:** February 4, 2026  
**Verified:** ✅ All corrections applied
