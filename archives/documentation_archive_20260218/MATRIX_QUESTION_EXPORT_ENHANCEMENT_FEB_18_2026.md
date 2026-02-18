# Matrix Question Export Enhancement - February 18, 2026

## Overview
Enhanced the export functionality for matrix-type questions in Event Results > Question-wise Analysis to provide better data analysis capabilities by flattening matrix responses into separate columns.

## Problem Statement
Previously, when exporting question responses (CSV/Excel) from the Question-wise Analysis tab:
- Matrix questions were exported as JSON objects or comma-separated values
- This made it difficult to analyze matrix data in spreadsheet applications
- Each row of a matrix question was not represented as a separate column
- No individual question export buttons were available

## Solution Implemented

### 1. Added Export Buttons to Each Question
**Location**: Event Results > Question-wise Analysis > Each Question Card

Added two export buttons for each question:
- **Excel Export** (Green button with FileSpreadsheet icon)
- **CSV Export** (Blue button with FileText icon)

These buttons appear in the question card header, next to the response statistics.

### 2. Matrix Question Flattening

For matrix-type questions, the export now creates separate columns for each row:

**Example:**
```
Question: Q3 - Rate our services (Matrix)
Rows: Service, Quality, Price
Columns: Poor, Fair, Good, Excellent
```

**Export Format:**
| # | Participant | Email | Q3_Service | Q3_Quality | Q3_Price | Submitted At |
|---|------------|-------|------------|------------|----------|--------------|
| 1 | John Doe   | john@example.com | Good | Excellent | Fair | 2026-02-18 10:30 |
| 2 | Jane Smith | jane@example.com | Excellent | Good | Good | 2026-02-18 11:45 |

Each matrix row becomes a separate column with the naming pattern: `{QuestionNumber}_{RowName}`

### 3. Support for All Question Types

The export functions handle all question types appropriately:

**Matrix Questions:**
- Flattened into separate columns as described above
- Each row of the matrix gets its own column

**Single/Multiple Choice Questions:**
- Exported as comma-separated values in a single column

**Text Questions:**
- Exported as plain text in a single column

**SCT Likert Questions:**
- Includes score column showing the points earned
- Response value in main column

**Other Questions:**
- Appropriate formatting based on question type

### 4. Additional Export Features

Each export includes:
- Row number (#)
- Participant name
- Participant email
- Question responses (flattened for matrix)
- Score column (for SCT Likert questions)
- Comment column (if comments exist)
- Submitted timestamp

## Technical Implementation

### Files Modified
- `/frontend/app/activities/[id]/results/page.tsx`

### Functions Added

#### 1. `exportQuestionResponsesAsExcel()`
```typescript
async function exportQuestionResponsesAsExcel(
  question: any, 
  participantResponses: any[], 
  sectionIndex: number, 
  qIndex: number
)
```
- Exports individual question responses to Excel (.xlsx)
- Handles matrix question flattening
- Sets appropriate column widths
- Generates descriptive filename

#### 2. `exportQuestionResponsesAsCSV()`
```typescript
async function exportQuestionResponsesAsCSV(
  question: any, 
  participantResponses: any[], 
  sectionIndex: number, 
  qIndex: number
)
```
- Exports individual question responses to CSV
- Handles matrix question flattening
- Generates descriptive filename

### UI Changes

**Export Buttons HTML:**
```tsx
<button
  onClick={async () => {
    await exportQuestionResponsesAsExcel(question, participantResponses, sectionIndex, qIndex);
  }}
  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-600..."
>
  <FileSpreadsheet className="w-4 h-4" />
  Excel
</button>

<button
  onClick={async () => {
    await exportQuestionResponsesAsCSV(question, participantResponses, sectionIndex, qIndex);
  }}
  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600..."
>
  <FileText className="w-4 h-4" />
  CSV
</button>
```

## Testing Instructions

### Test Case 1: Matrix Question Export
1. Navigate to an event with a matrix-type question
2. Go to "Event Results" > "Question-wise Analysis" tab
3. Find the matrix question
4. Click the "Excel" or "CSV" button on the question card
5. **Expected**: File downloads with columns like `Q3_Service`, `Q3_Quality`, `Q3_Price`
6. **Verify**: Each participant's response appears in the appropriate columns

### Test Case 2: Non-Matrix Question Export
1. Navigate to a question that is NOT a matrix (e.g., single choice)
2. Click the "Excel" or "CSV" button
3. **Expected**: File downloads with single response column for the question
4. **Verify**: All responses are properly formatted

### Test Case 3: SCT Likert Question Export
1. Navigate to an SCT Likert question
2. Click the "Excel" or "CSV" button
3. **Expected**: File includes both response and score columns
4. **Verify**: Scores are correctly displayed

### Test Case 4: Empty Responses
1. Navigate to a question with no responses
2. Click the "Excel" or "CSV" button
3. **Expected**: Warning toast: "There are no responses for this question to export yet."

### Test Case 5: Multiple Question Types in One Event
1. Export multiple questions of different types
2. **Verify**: Each export correctly handles its question type
3. **Verify**: Filenames are descriptive and unique

## Benefits

✅ **Better Data Analysis**: Matrix data can now be analyzed in Excel/Google Sheets with proper column structure

✅ **Individual Question Export**: Focus on specific questions without exporting entire event results

✅ **Consistent Format**: All question types export with consistent participant information

✅ **Professional Naming**: Column names like `Q3_Service` are clear and professional

✅ **Score Integration**: SCT questions include score data for immediate analysis

✅ **User-Friendly**: Simple one-click export from each question card

## Example Use Cases

1. **Survey Analysis**: Analyze satisfaction ratings across different service aspects separately
2. **Performance Tracking**: Track individual criteria scores over time
3. **Comparative Studies**: Compare responses across different matrix rows
4. **Reporting**: Create professional reports with properly structured data
5. **Data Integration**: Import into BI tools or databases with proper column structure

## Notes

- Matrix question rows are automatically detected from `question.settings.rows` or `question.rows`
- Empty responses are marked as "No response"
- Filenames include question number and truncated question title for easy identification
- Export functions use the XLSX library for both Excel and CSV generation
- All exports include UTF-8 BOM for proper international character support

## Status
✅ **DEPLOYED AND READY TO USE**

Date: February 18, 2026
Developer: AI Assistant
Test Status: Implementation complete, ready for user testing
