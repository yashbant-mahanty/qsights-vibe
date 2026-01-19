# Value Display Mode - Quick Usage Guide

## 🎯 How to Use the Feature

### Step 1: Create/Edit a Questionnaire
1. Navigate to **Questionnaires** → **Create New** (or edit existing)
2. Add a **Slider Scale** or **Dial Gauge** question
3. Scroll down to the "**Value Display Mode**" section

### Step 2: Configure Display Mode

#### Option A: Number Mode (Default)
- Select **"Number"** radio button
- Displays raw numeric value (e.g., "75")
- Stores as plain number in database
- **No additional configuration needed**

#### Option B: Range Mode
- Select **"Range"** radio button
- Click "**Add Range Mapping**" button
- For each range, enter:
  - **Min:** Starting value (e.g., 0)
  - **Max:** Ending value (e.g., 50)
  - **Label:** Display text (e.g., "Low")
- Example configuration:
  ```
  Range 1: Min=0,  Max=50,  Label="Low"
  Range 2: Min=51, Max=80,  Label="Medium"
  Range 3: Min=81, Max=100, Label="High"
  ```
- Click "**Validate Ranges**" to check for overlaps/gaps
- **Important:** Ranges must cover all possible values with no overlaps

#### Option C: Text Mode
- Select **"Text"** radio button
- **Option 1 - Auto Generate:**
  - Click "**Auto-Generate Mappings**" button
  - System creates labels for each step value
  - For slider 0-10 with step=1, generates: "0", "1", "2", ..., "10"
  
- **Option 2 - Manual Entry:**
  - Click "**Add Text Mapping**" button
  - For each value, enter:
    - **Value:** Numeric slider position (e.g., 0)
    - **Label:** Display text (e.g., "Very Poor")
  - Example for 0-10 slider:
    ```
    Value=0,  Label="Very Poor"
    Value=2,  Label="Poor"
    Value=5,  Label="Average"
    Value=8,  Label="Good"
    Value=10, Label="Excellent"
    ```

### Step 3: Save Questionnaire
1. Click **Save** button at bottom of page
2. Configuration is stored in question settings

### Step 4: Publish & Test
1. Create/edit an **Activity** using this questionnaire
2. Publish the activity
3. Access participant take page
4. Move the slider and observe:
   - **Number mode:** Shows "75"
   - **Range mode:** Shows "Medium (51-80)"
   - **Text mode:** Shows "Good" (or nearest configured label)

---

## 📊 What Gets Stored

### Number Mode
```json
75
```
Plain numeric value in `answers.value` column

### Range/Text Mode
```json
{
  "value_type": "range",
  "raw_value": 75,
  "display_value": "Medium (51-80)",
  "resolved_value": "Medium (51-80)"
}
```
JSON object in `answers.value` column

---

## ✅ Validation Rules

### Range Mode:
- ✅ All values between min and max must be covered
- ✅ No overlapping ranges
- ✅ Min < Max for each range
- ❌ Gaps between ranges will show error
- ❌ Overlapping ranges will show error

### Text Mode:
- ✅ Each value must have exactly one label
- ✅ Values must be within slider min-max bounds
- ✅ Values must align with step increment
- ❌ Duplicate values will show error
- ❌ Out-of-range values will show error

---

## 🎨 Display Examples

### Range Mode with 0-100 Slider:
| User Moves Slider To | Display Shows |
|---------------------|---------------|
| 25 | "Low (0-50)" |
| 65 | "Medium (51-80)" |
| 95 | "High (81-100)" |

### Text Mode with 0-10 Slider:
| User Moves Slider To | Display Shows |
|---------------------|---------------|
| 0 | "Very Poor" |
| 2 | "Poor" |
| 5 | "Average" |
| 8 | "Good" |
| 10 | "Excellent" |

---

## 🔍 Troubleshooting

### Configuration UI Not Appearing
- **Check:** Are you editing a `slider_scale` or `dial_gauge` question?
- **Solution:** This feature only works for these two question types

### Validation Shows "Overlapping Ranges"
- **Problem:** Two ranges have overlapping min-max values
- **Solution:** Adjust ranges so each value belongs to exactly one range
  ```
  ❌ Range 1: 0-50, Range 2: 50-100  (50 appears twice)
  ✅ Range 1: 0-50, Range 2: 51-100  (no overlap)
  ```

### Validation Shows "Gaps in Ranges"
- **Problem:** Some slider values aren't covered by any range
- **Solution:** Ensure ranges cover entire slider range
  ```
  ❌ Range 1: 0-40, Range 2: 60-100  (41-59 uncovered)
  ✅ Range 1: 0-40, Range 2: 41-100  (full coverage)
  ```

### Slider Shows Number Instead of Label
- **Check 1:** Did you save the questionnaire after configuration?
- **Check 2:** Did the frontend build complete successfully?
- **Check 3:** Did you restart PM2 after deployment?
- **Solution:** Re-save questionnaire, rebuild frontend, restart services

### Database Shows Plain Number Instead of JSON
- **Check:** Is valueDisplayMode set to 'range' or 'text'?
- **Cause:** If mode is 'number' or not configured, stores plain value
- **Solution:** This is expected behavior for number mode

---

## 📈 Use Cases

### Medical Pain Scale (0-10 Slider)
```
Text Mode:
0 = "No Pain"
2 = "Mild Pain"
5 = "Moderate Pain"
7 = "Severe Pain"
10 = "Worst Possible Pain"
```

### Customer Satisfaction (0-100 Slider)
```
Range Mode:
0-20   = "Very Dissatisfied"
21-40  = "Dissatisfied"
41-60  = "Neutral"
61-80  = "Satisfied"
81-100 = "Very Satisfied"
```

### Temperature Preference (-10 to +10 Dial)
```
Range Mode:
-10 to -5  = "Too Cold"
-4 to +4   = "Comfortable"
+5 to +10  = "Too Hot"
```

### Employee Engagement (1-7 Likert)
```
Text Mode:
1 = "Strongly Disagree"
2 = "Disagree"
3 = "Somewhat Disagree"
4 = "Neutral"
5 = "Somewhat Agree"
6 = "Agree"
7 = "Strongly Agree"
```

---

## 🚀 Pro Tips

1. **Use Auto-Generate** for evenly spaced labels (saves time)
2. **Use Range Mode** when grouping continuous values (e.g., age groups)
3. **Use Text Mode** for specific points on a scale (e.g., Likert scales)
4. **Test First** in preview mode before publishing to participants
5. **Keep Labels Short** for better mobile display (max ~20 characters)
6. **Validate Early** before adding many mappings (catches errors sooner)

---

## 📞 Support

- **Documentation:** `/VALUE_DISPLAY_MODE_COMPLETE.md`
- **Deployment Log:** `/DEPLOYMENT_SUCCESS_VALUE_DISPLAY_19_JAN_2026.md`
- **Technical Details:** `/VALUE_DISPLAY_MODE_IMPLEMENTATION.md`

---

**Feature Deployed:** 19 January 2026  
**Status:** Production Ready ✅
