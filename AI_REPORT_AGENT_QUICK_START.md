# AI Report Agent - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### What You Need:
1. OpenAI API Key (see detailed setup below)
2. Access to QSights backend `.env` file
3. An event with responses in the system

---

## Step 1: Get Your OpenAI API Key (2 minutes)

1. Go to: https://platform.openai.com/signup
2. Sign up (use Google for faster signup)
3. Go to: https://platform.openai.com/account/billing/overview
4. Add a payment method (credit card required)
5. Go to: https://platform.openai.com/api-keys
6. Click "Create new secret key"
7. Name it: `QSights-AI-Agent`
8. **COPY THE KEY IMMEDIATELY** (you won't see it again!)
   - It looks like: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## Step 2: Add API Key to Environment (1 minute)

### Local Development:
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0/backend
nano .env
```

Add these lines at the bottom:
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-paste-your-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7
```

Save (Ctrl+X, Y, Enter)

### Restart Laravel:
```bash
php artisan config:clear
php artisan cache:clear
```

---

## Step 3: Test It! (2 minutes)

### Option A: Quick Backend Test
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0/backend
php artisan tinker
```

Then run:
```php
$client = OpenAI::client(env('OPENAI_API_KEY'));
$response = $client->chat()->create([
    'model' => 'gpt-4o-mini',
    'messages' => [
        ['role' => 'user', 'content' => 'Say: API key works!']
    ]
]);
echo $response->choices[0]->message->content;
```

Expected output: `API key works!`

### Option B: Test in Browser
1. Open: http://localhost:3000 (or your dev URL)
2. Log in as admin/super-admin
3. Go to **AI Reports** in sidebar
4. Select an event that has responses
5. Click the **"ASK Agent"** tab
6. Type: **"How many participants completed the survey?"**
7. Press Enter

You should see:
- AI processing indicator
- A response with data visualization
- A summary text

---

## 📝 Example Queries to Try

Once you're in the ASK Agent tab:

### Basic Counts:
- "How many participants?"
- "How many people completed the survey?"
- "Total submissions"

### Trends:
- "Show submission trends"
- "Daily participation over last week"
- "When do people submit most?"

### Comparisons:
- "Compare by country"
- "Male vs female participation"
- "Which profession participates most?"

### Rankings:
- "Which country has highest completion rate?"
- "Top 5 cities by responses"
- "Best performing regions"

### Complex:
- "How many cardiologists aged 30-45 participated?"
- "What's the average completion time by country?"
- "Show me age distribution"

---

## 💰 Cost Monitoring

### Set Usage Limits (IMPORTANT!):
1. Go to: https://platform.openai.com/account/limits
2. Set monthly budget: **$20** (adjust as needed)
3. Enable email alerts at 75% and 90%

### Check Usage:
https://platform.openai.com/usage

Expected costs:
- **Development (10-20 queries/day):** $1-2/month
- **Production (100-200 queries/day):** $5-15/month

---

## 🔒 Security Checklist

✅ **Before going live:**
- [ ] API key is in `.env` file only
- [ ] `.env` is in `.gitignore`
- [ ] Set monthly spending limit in OpenAI
- [ ] Test with production data permissions
- [ ] Verify SQL queries are correct (check "Technical Details")
- [ ] Set up usage alerts

---

## ❌ Common Issues & Fixes

### "AI service not configured"
**Fix:** Check if `OPENAI_API_KEY` is in `.env` and run `php artisan config:clear`

### "Invalid API Key"
**Fix:** 
1. Check key format (starts with `sk-proj-`)
2. Verify at: https://platform.openai.com/api-keys
3. Check payment method is active

### "Rate limit exceeded"
**Fix:** Wait 1 minute, or upgrade OpenAI plan

### No results / Wrong data
**Fix:**
1. Check if event has responses
2. Verify user has access to the event
3. Look at SQL query in "Technical Details"

---

## 📱 User Guide (For Your Team)

Share this with your users:

### How to Use ASK Agent:

1. **Navigate to AI Reports**
   - Click "AI Reports" in the sidebar

2. **Select an Event**
   - Choose an event from the list
   - Must have at least 1 response

3. **Switch to ASK Agent Tab**
   - Click the "ASK Agent" tab (next to "AI Report Builder")

4. **Ask Questions**
   - Type your question in plain English
   - Press Enter or click Send
   - Wait 2-5 seconds for response

5. **View Results**
   - Charts, tables, or numbers will appear
   - Read the AI summary below
   - Click "Technical Details" to see SQL query

6. **Follow-Up Questions**
   - Ask related questions for context
   - Agent remembers previous conversation

### Tips:
- Be specific: "cardiologists aged 30-45" not just "doctors"
- Ask one thing at a time
- Use natural language - no need for technical terms
- Try suggested queries if stuck

---

## 🎯 What's Next?

Once everything works:

1. **Test with real data** (different events, user roles)
2. **Monitor costs** for first week
3. **Gather user feedback**
4. **Adjust settings** if needed:
   - Model (gpt-4o for better results, higher cost)
   - Max tokens (increase for longer responses)
   - Temperature (0.3 for consistent, 0.9 for creative)

5. **Deploy to production** when ready

---

## 📚 Full Documentation

For detailed technical information:
- [Complete Implementation Guide](AI_REPORT_AGENT_IMPLEMENTATION_FEB_05_2026.md)
- [OpenAI API Key Setup](OPENAI_API_KEY_SETUP_GUIDE.md)

---

## 🆘 Need Help?

1. Check error in browser console (F12)
2. Check Laravel logs: `backend/storage/logs/laravel.log`
3. Test API key with tinker command above
4. Review [Troubleshooting section](AI_REPORT_AGENT_IMPLEMENTATION_FEB_05_2026.md#-troubleshooting)

---

**That's it! You're ready to use AI Report Agent! 🎉**

Start by asking: "How many participants completed the survey?"
