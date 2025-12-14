# Sand Tweet Collector

## Setup Complete! 🎉

The Sand collection engine is ready to gather thinking material from @ghuubear's Twitter/X account.

## Next Steps

### 1. Add Your Apify API Token

1. Go to https://console.apify.com/account/integrations
2. Copy your API token
3. Open `.env` file
4. Replace `your_apify_api_token_here` with your actual token

### 2. Test Your Connection

```bash
npm run test-connection
```

This will verify:
- Your API token is valid
- You can connect to Apify
- The Twitter scraper is available

### 3. Collect Tweets

Once the test passes:

```bash
npm run collect
```

This will:
- Connect to Apify
- Scrape ~10,000 tweets from @ghuubear
- Include original tweets, retweets, and replies
- Save simplified data to `data/raw/ghuubear_raw.json`

## Output Format

The collected tweets will be in this simple format:

```json
{
  "tweets": [
    {
      "id": "tweet_id",
      "thread_id": "parent_id_or_null",
      "content": "Raw tweet text including URLs, mentions, etc."
    }
  ]
}
```

## What's Included

- **Original tweets**: Direct thoughts from Ghuubear
- **Retweets**: Shows what resonates with their thinking
- **Replies**: Conversational context and responses
- **Thread relationships**: Preserved for context

## File Structure

```
sand/
├── src/
│   ├── collect-tweets.js    # Main collector script
│   └── test-connection.js   # Connection tester
├── data/
│   └── raw/                 # Raw tweet data goes here
├── .env                     # Your API credentials (not in git)
├── package.json             # Project config
└── CLAUDE.md               # Sand project documentation
```

## Notes

- The scraper may take 5-15 minutes depending on the number of tweets
- Retweets are included because they reveal what the person cares about
- Thread relationships are preserved for maintaining context
- The output is kept simple and focused on content for Sand's purpose