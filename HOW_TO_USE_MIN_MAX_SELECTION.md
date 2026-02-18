# 📘 How to Use Min/Max Selection Limits

**Feature**: Minimum and Maximum Selection Limits for Questions  
**Applies to**: Multiple Choice (Checkboxes) questions ONLY  
**Does NOT apply to**: Single Choice (Radio) questions

---

## ✅ Step-by-Step Guide

### Step 1: Create a Questionnaire
1. Go to **Questionnaires** page
2. Click **"Create Questionnaire"** or edit existing one

### Step 2: Add a Multiple Choice Question
1. Click **"Add Question"**
2. **IMPORTANT**: Select question type as **"Multiple Choice"** (checkboxes)
   - ❌ DO NOT select "Single Choice (MCQ)" (radio buttons)
   - ✅ SELECT "Multiple Choice" (allows selecting multiple options)

### Step 3: Add Options
1. Add at least 2 options to your question
2. Example options:
   - Option A
   - Option B
   - Option C
   - Option D
   - Option E

### Step 4: Set Selection Limits
Once you've selected "Multiple Choice" type, you'll see a new section below the options:

**"Selection Limits"** section will appear with:
- **Minimum Selection**: How many options user MUST select (≥ 0)
- **Maximum Selection**: How many options user CAN select (≥ 1)

Example configurations:
- Min: 2, Max: 5 → User must select between 2 and 5 options
- Min: 1, Max: 3 → User must select between 1 and 3 options
- Min: 0, Max: 0 → No limit (default behavior)

### Step 5: Save Questionnaire
1. Click **"Save Questionnaire"**
2. The limits will be saved to database

---

## 🎯 Question Types Explained

### ❌ Single Choice (MCQ/Radio) - NO min/max limits
- **Type**: `mcq` or `radio`
- **UI**: Radio buttons (○)
- **Behavior**: User can select ONLY 1 option
- **Selection Limits**: NOT AVAILABLE (doesn't make sense for single choice)

### ✅ Multiple Choice (Checkboxes) - HAS min/max limits
- **Type**: `multi`
- **UI**: Checkboxes (☐)
- **Behavior**: User can select multiple options
- **Selection Limits**: ✅ AVAILABLE
- **Example**: "Select your top 3 favorite colors (minimum 2, maximum 3)"

---

## 🖼️ Visual Guide

### When you'll see "Selection Limits":
```
Question Type: [Multiple Choice ▼]  ← Must select this!

Options:
☐ Option A
☐ Option B
☐ Option C
☐ Option D

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ Selection Limits            ← This section appears!

Minimum Selection: [2]
Maximum Selection: [4]

Select between 2 and 4 options
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### When you WON'T see "Selection Limits":
```
Question Type: [Single Choice (MCQ) ▼]  ← Radio button type

Options:
○ Option A
○ Option B
○ Option C

(No "Selection Limits" section appears)
```

---

## 🧪 Testing Steps

1. **Login to production**: https://prod.qsights.com
2. **Go to Questionnaires** page
3. **Create New Questionnaire**
4. **Add Question** → Select **"Multiple Choice"** type (NOT Single Choice)
5. **Add 5 options**
6. **Look for "Selection Limits"** section below options
7. **Set Min = 2, Max = 4**
8. **Save** questionnaire
9. **Create an Activity** using this questionnaire
10. **Take the Activity** as a participant
11. **Try selecting only 1 option** → Cannot submit (validation)
12. **Try selecting 5 options** → Last option can't be selected (max limit)
13. **Select 2-4 options** → Can submit successfully

---

## 🔍 Troubleshooting

### "I don't see the Selection Limits section"
✅ **Check**: Are you creating a **"Multiple Choice"** question?
- If you selected "Single Choice (MCQ)" or "Radio", change it to "Multiple Choice"

✅ **Check**: Did you add options?
- Selection limits only make sense if you have options

✅ **Check**: Are you in preview mode?
- Selection Limits only show in EDIT mode, not preview mode

### "My changes aren't showing"
✅ **Clear browser cache**:
- Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or use Incognito/Private mode

✅ **Hard refresh**: 
- `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

---

## 📊 Valid Configurations

| Min | Max | Result |
|-----|-----|--------|
| 0 | 0 | No limit (default) |
| 1 | 5 | Must select 1-5 options |
| 2 | 3 | Must select 2-3 options |
| 3 | 3 | Must select exactly 3 options |

### Invalid Configurations (will show warning):
- Min > Max → "⚠️ Minimum cannot be greater than maximum"
- Max > Total Options → "⚠️ Maximum cannot exceed total options (N)"

---

## 💡 Example Use Cases

### Survey Example:
**Question**: "Which of the following skills do you possess?"
- Type: **Multiple Choice**
- Options: Communication, Leadership, Technical, Problem Solving, Teamwork
- Min: **2**, Max: **4**
- User Experience: "Select between 2 and 4 options (0 selected)"

### Assessment Example:
**Question**: "Select the THREE most important factors for project success"
- Type: **Multiple Choice**
- Options: Budget, Timeline, Quality, Team, Communication, Risk Management
- Min: **3**, Max: **3**
- User Experience: Must select exactly 3 options

---

## 🎬 Quick Start Checklist

- [ ] Login to admin panel
- [ ] Create/Edit questionnaire
- [ ] Add new question
- [ ] **Select "Multiple Choice" type** (NOT Single Choice)
- [ ] Add options (at least 2)
- [ ] Scroll down to see "Selection Limits" section
- [ ] Set min and max values
- [ ] Save questionnaire
- [ ] Test by taking the activity

---

**Remember**: Selection Limits feature **ONLY works with Multiple Choice (checkboxes)** questions, NOT with Single Choice (radio) questions!
