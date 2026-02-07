# OpenAI API Key Setup Guide

## 📋 Overview
This guide will help you set up an OpenAI API key for the AI Report Agent feature.

---

## Step 1: Create OpenAI Account

1. Go to [https://platform.openai.com/signup](https://platform.openai.com/signup)
2. Sign up with your email or Google account
3. Verify your email address

---

## Step 2: Add Payment Method

⚠️ **Important**: OpenAI requires a payment method to use the API.

1. Go to [https://platform.openai.com/account/billing/overview](https://platform.openai.com/account/billing/overview)
2. Click **"Add payment method"**
3. Enter your credit card details
4. Set up billing limits (recommended: $10-50/month for development)

### Pricing Reference (as of Feb 2026):
- **GPT-4o-mini**: $0.150 / 1M input tokens, $0.600 / 1M output tokens (Recommended for cost)
- **GPT-4o**: $2.50 / 1M input tokens, $10.00 / 1M output tokens (Most powerful)
- **GPT-3.5-turbo**: $0.50 / 1M input tokens, $1.50 / 1M output tokens (Cheaper alternative)

**Estimated Cost**: For typical usage (100-200 queries/day), expect $5-15/month with GPT-4o-mini.

---

## Step 3: Generate API Key

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **"Create new secret key"**
3. Name it: `QSights-AI-Report-Agent`
4. Set permissions: **All** (or custom with Read/Write access)
5. Click **"Create secret key"**
6. **IMPORTANT**: Copy the key immediately - it won't be shown again!
   - Format: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## Step 4: Add to Your Environment

### For Local Development:

1. Open `/backend/.env` file
2. Add these lines:
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-actual-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7
```

### For Production Server:

1. SSH into your production server
2. Edit the environment file:
```bash
cd /var/www/html/qsights/backend
nano .env
```

3. Add the same OpenAI configuration variables
4. Save and exit (Ctrl+X, Y, Enter)
5. Restart Laravel/PHP:
```bash
sudo systemctl restart php8.1-fpm  # or your PHP version
# OR if using PM2:
pm2 restart all
```

---

## Step 5: Verify Setup

### Test the API Key:
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
        ['role' => 'user', 'content' => 'Say "API key works!"']
    ]
]);
echo $response->choices[0]->message->content;
```

You should see: `API key works!`

---

## Security Best Practices

### ✅ DO:
- Store API key in `.env` file only
- Add `.env` to `.gitignore`
- Use environment variables
- Set usage limits in OpenAI dashboard
- Rotate keys periodically
- Use separate keys for dev/staging/production

### ❌ DON'T:
- Commit API keys to Git
- Share keys in chat/email
- Use same key across multiple projects
- Expose keys in frontend code
- Leave unlimited spending enabled

---

## Monitoring Usage

1. Go to [https://platform.openai.com/usage](https://platform.openai.com/usage)
2. View your daily/monthly usage
3. Set up email alerts for spending thresholds
4. Monitor costs in real-time

---

## Alternative: Using OpenAI Proxies (Optional)

If you prefer not to use OpenAI directly, you can use:

1. **Azure OpenAI**: Enterprise option with SLA
2. **OpenRouter**: Access multiple models with one API
3. **Local LLMs**: Ollama + Llama 3 (free but needs powerful hardware)

---

## Troubleshooting

### Error: "Invalid API Key"
- Check if key is copied correctly (no extra spaces)
- Verify key hasn't been revoked
- Check payment method is valid

### Error: "Rate Limit Exceeded"
- You've hit the requests-per-minute limit
- Upgrade your plan or wait a minute
- Implement request queuing

### Error: "Insufficient Quota"
- Add more credits to your account
- Check billing limits

---

## Cost Optimization Tips

1. **Use GPT-4o-mini** for most queries (20x cheaper than GPT-4o)
2. **Cache common queries** in Redis/database
3. **Limit token usage**: Set `max_tokens` to reasonable values
4. **Implement request throttling**: Max queries per user per hour
5. **Use streaming**: Show results as they arrive
6. **Batch similar queries**: Combine when possible

---

## Next Steps

After setting up your API key:

1. ✅ Verify it works with the test command
2. ✅ Deploy the AI Report Agent backend code
3. ✅ Test with sample queries
4. ✅ Monitor usage for first week
5. ✅ Adjust settings based on usage patterns

---

## Support

**OpenAI Help**: [https://help.openai.com](https://help.openai.com)  
**API Docs**: [https://platform.openai.com/docs](https://platform.openai.com/docs)  
**Community**: [https://community.openai.com](https://community.openai.com)

---

**Last Updated**: February 5, 2026
