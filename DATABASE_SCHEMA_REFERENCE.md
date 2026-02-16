# QSights Database Schema Reference

**Last Updated**: 16 February 2026  
**Purpose**: Quick reference for table structures to avoid data type mismatches in migrations  
**Database**: PostgreSQL

---

## ⚠️ CRITICAL: Always Check This Before Creating Migrations!

**Common Mistake**: Using `uuid()` for foreign keys when the referenced table uses `bigInteger()/bigint`

---

## Table ID Column Types

### UUID Tables (use `uuid()` in migrations)
| Table | Primary Key Type |
|-------|------------------|
| `activities` | uuid |
| `programs` | uuid |
| `responses` | uuid |
| `activity_access_tokens` | uuid |
| `evaluation_events` | uuid |
| `evaluation_triggered` | uuid |

### BIGINT Tables (use `bigInteger()` in migrations)
| Table | Primary Key Type |
|-------|------------------|
| `users` | bigint (auto-increment) |
| `organizations` | bigint (auto-increment) |
| `questionnaires` | bigint (auto-increment) |
| `questions` | bigint (auto-increment) |
| `answers` | bigint (auto-increment) |
| `participants` | bigint (auto-increment) |
| `group_heads` | bigint (auto-increment) |
| `questionnaire_videos` | bigint (auto-increment) |
| `video_view_logs` | bigint (auto-increment) |

---

## Complete Table Schemas (Key Columns)

### 1. activities
```
id                          uuid (PK)
program_id                  uuid (FK → programs.id)
questionnaire_id            bigint (FK → questionnaires.id)
name                        varchar
type                        enum
status                      enum
start_date                  timestamp
end_date                    timestamp
created_at                  timestamp
updated_at                  timestamp
deleted_at                  timestamp (nullable)
```

### 2. programs
```
id                          uuid (PK)
organization_id             bigint (FK → organizations.id)
name                        varchar
code                        varchar
status                      enum
created_at                  timestamp
updated_at                  timestamp
deleted_at                  timestamp (nullable)
```

### 3. questionnaires
```
id                          bigint (PK, auto-increment)
program_id                  uuid (FK → programs.id)
title                       varchar
description                 text
type                        enum
created_at                  timestamp
updated_at                  timestamp
deleted_at                  timestamp (nullable)
```

### 4. questions
```
id                          bigint (PK, auto-increment)
questionnaire_id            bigint (FK → questionnaires.id)
question_text               text
question_type               enum
order                       integer
created_at                  timestamp
updated_at                  timestamp
deleted_at                  timestamp (nullable)
```

### 5. responses
```
id                          uuid (PK)
activity_id                 uuid (FK → activities.id)
participant_id              bigint (FK → participants.id)
status                      enum
started_at                  timestamp
submitted_at                timestamp
created_at                  timestamp
updated_at                  timestamp
deleted_at                  timestamp (nullable)
```

### 6. answers
```
id                          bigint (PK, auto-increment)
response_id                 uuid (FK → responses.id)
question_id                 bigint (FK → questions.id)
answer_text                 text
answer_value                jsonb
comment_text                text (nullable)
commented_at                timestamp (nullable)
created_at                  timestamp
updated_at                  timestamp
```

### 7. participants
```
id                          bigint (PK, auto-increment)
program_id                  uuid (FK → programs.id)
user_id                     bigint (FK → users.id, nullable)
email                       varchar
name                        varchar
type                        enum (authenticated/guest)
created_at                  timestamp
updated_at                  timestamp
deleted_at                  timestamp (nullable)
```

### 8. users
```
id                          bigint (PK, auto-increment)
name                        varchar
email                       varchar (unique)
role                        enum
organization_id             bigint (FK → organizations.id, nullable)
program_id                  uuid (FK → programs.id, nullable)
created_at                  timestamp
updated_at                  timestamp
deleted_at                  timestamp (nullable)
```

### 9. organizations
```
id                          bigint (PK, auto-increment)
name                        varchar
status                      enum
created_at                  timestamp
updated_at                  timestamp
deleted_at                  timestamp (nullable)
```

### 10. video_watch_tracking
```
id                          bigint (PK, auto-increment)
response_id                 uuid (FK → responses.id)
question_id                 bigint (FK → questions.id, nullable)
video_type                  enum (QUESTION/INTRO/THANKYOU)
watched_duration_seconds    integer
total_duration_seconds      integer
completed_at                timestamp (nullable)
created_at                  timestamp
updated_at                  timestamp
UNIQUE (response_id, question_id, video_type)
```

### 11. questionnaire_videos
```
id                          bigint (PK, auto-increment)
questionnaire_id            bigint (FK → questionnaires.id)
video_type                  enum (intro/section/thankyou)
video_url                   varchar
thumbnail_url               varchar (nullable)
duration_seconds            integer
created_at                  timestamp
updated_at                  timestamp
```

---

## Migration Helper Patterns

### Foreign Key Definition Examples

```php
// ✅ CORRECT: activities table
Schema::create('activities', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('program_id')->nullable();           // programs.id is UUID
    $table->bigInteger('questionnaire_id')->nullable(); // questionnaires.id is BIGINT
    
    $table->foreign('program_id')->references('id')->on('programs');
    $table->foreign('questionnaire_id')->references('id')->on('questionnaires');
});

// ✅ CORRECT: responses table
Schema::create('responses', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('activity_id');                      // activities.id is UUID
    $table->bigInteger('participant_id')->nullable(); // participants.id is BIGINT
    
    $table->foreign('activity_id')->references('id')->on('activities');
    $table->foreign('participant_id')->references('id')->on('participants');
});

// ✅ CORRECT: answers table
Schema::create('answers', function (Blueprint $table) {
    $table->bigIncrements('id');
    $table->uuid('response_id');                      // responses.id is UUID
    $table->bigInteger('question_id');                // questions.id is BIGINT
    
    $table->foreign('response_id')->references('id')->on('responses');
    $table->foreign('question_id')->references('id')->on('questions');
});

// ❌ WRONG: Don't use uuid() for bigint foreign keys
$table->uuid('question_id'); // WRONG if questions.id is bigint!

// ❌ WRONG: Don't use bigInteger() for uuid foreign keys
$table->bigInteger('activity_id'); // WRONG if activities.id is uuid!
```

---

## Quick Reference Table

| If referencing... | Use data type... | Example |
|-------------------|------------------|---------|
| activities.id | `uuid('...')` | `$table->uuid('activity_id')` |
| programs.id | `uuid('...')` | `$table->uuid('program_id')` |
| responses.id | `uuid('...')` | `$table->uuid('response_id')` |
| questionnaires.id | `bigInteger('...')` | `$table->bigInteger('questionnaire_id')` |
| questions.id | `bigInteger('...')` | `$table->bigInteger('question_id')` |
| answers.id | `bigInteger('...')` | `$table->bigInteger('answer_id')` |
| participants.id | `bigInteger('...')` | `$table->bigInteger('participant_id')` |
| users.id | `bigInteger('...')` | `$table->bigInteger('user_id')` |
| organizations.id | `bigInteger('...')` | `$table->bigInteger('organization_id')` |

---

## Verification Commands

Before creating a migration, verify column types on production:

```bash
# Check a specific table structure
ssh -i $PEM ubuntu@$SERVER "cd /var/www/QSightsOrg2.0/backend && php artisan db:table TABLE_NAME 2>/dev/null"

# Check specific column type
ssh -i $PEM ubuntu@$SERVER "cd /var/www/QSightsOrg2.0/backend && php artisan db:table TABLE_NAME 2>/dev/null | grep '  COLUMN_NAME'"

# Example: Check questions.id type
ssh -i $PEM ubuntu@$SERVER "cd /var/www/QSightsOrg2.0/backend && php artisan db:table questions 2>/dev/null | grep '^  id'"
# Output: id int8, autoincrement ........ bigint
```

---

## Common Enum Values

### activity.type
- `questionnaire`
- `survey`
- `evaluation`

### activity.status
- `draft`
- `published`
- `closed`

### question.question_type
- `text`
- `textarea`
- `radio`
- `checkbox`
- `dropdown`
- `likert`
- `ranking`
- `matrix`
- `video`
- `mcq`
- `sct`
- `sct_likert`

### response.status
- `in_progress`
- `submitted`
- `incomplete`

### participant.type
- `authenticated`
- `guest`

### user.role
- `super-admin`
- `admin`
- `group-head`
- `program-admin`
- `program-manager`
- `program-moderator`
- `participant`

### video_type (questionnaire_videos)
- `intro`
- `section`
- `thankyou`

### video_type (video_watch_tracking)
- `QUESTION`
- `INTRO`
- `THANKYOU`

---

## Notes

1. **UUID vs BIGINT Pattern**: Generally, top-level entities (activities, programs) use UUID, while content entities (questionnaires, questions, answers) use BIGINT auto-increment.

2. **Soft Deletes**: Most tables have `deleted_at` timestamp for soft delete functionality.

3. **Always verify on production** before creating migrations involving foreign keys.

4. **PostgreSQL specific**: Uses `int8` (equivalent to `bigint`), `uuid` type is native.

5. **When changing column types**: Use `->change()` with the correct type that matches the current database schema.

---

## Update History

| Date | Changes | Updated By |
|------|---------|------------|
| 2026-02-16 | Initial creation with core table schemas | AI Agent |
