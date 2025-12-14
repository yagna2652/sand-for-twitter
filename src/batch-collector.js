// Sand Batch Tweet Collector
// Collects tweets in date-based batches to get complete history

require('dotenv').config();
const { ApifyClient } = require('apify-client');
const fs = require('fs-extra');
const path = require('path');

// Configuration from environment
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const TWITTER_HANDLE = process.env.TWITTER_HANDLE;

// Output directory for batches
const BATCH_DIR = path.join(__dirname, '..', 'data', 'raw', 'batches');

// Actor ID
const ACTOR_ID = 'apidojo/tweet-scraper';

// Define all date range batches (working backwards from present)
const batches = [
  {
    name: "Oct 2025 (current)",
    since: "2025-10-01",
    until: "2025-10-31",
    filename: "batch_2025_10.json"
  },
  {
    name: "Jul-Sep 2025",
    since: "2025-07-01",
    until: "2025-09-30",
    filename: "batch_2025_07_09.json"
  },
  {
    name: "Apr-Jun 2025",
    since: "2025-04-01",
    until: "2025-06-30",
    filename: "batch_2025_04_06.json"
  },
  {
    name: "Jan-Mar 2025",
    since: "2025-01-01",
    until: "2025-03-31",
    filename: "batch_2025_01_03.json"
  },
  {
    name: "Oct-Dec 2024",
    since: "2024-10-01",
    until: "2024-12-31",
    filename: "batch_2024_10_12.json"
  },
  {
    name: "Jul-Sep 2024",
    since: "2024-07-01",
    until: "2024-09-30",
    filename: "batch_2024_07_09.json",
    completed: true // Already done in test, but we'll re-run for consistency
  },
  {
    name: "Apr-Jun 2024",
    since: "2024-04-01",
    until: "2024-06-30",
    filename: "batch_2024_04_06.json"
  },
  {
    name: "Jan-Mar 2024",
    since: "2024-01-01",
    until: "2024-03-31",
    filename: "batch_2024_01_03.json"
  },
  {
    name: "Oct-Dec 2023",
    since: "2023-10-01",
    until: "2023-12-31",
    filename: "batch_2023_10_12.json"
  },
  {
    name: "Jul-Sep 2023",
    since: "2023-07-01",
    until: "2023-09-30",
    filename: "batch_2023_07_09.json"
  },
  {
    name: "Apr-Jun 2023",
    since: "2023-04-01",
    until: "2023-06-30",
    filename: "batch_2023_04_06.json"
  },
  {
    name: "Jan-Mar 2023",
    since: "2023-01-01",
    until: "2023-03-31",
    filename: "batch_2023_01_03.json"
  },
  {
    name: "Oct-Dec 2022",
    since: "2022-10-01",
    until: "2022-12-31",
    filename: "batch_2022_10_12.json"
  },
  {
    name: "Jul-Sep 2022",
    since: "2022-07-01",
    until: "2022-09-30",
    filename: "batch_2022_07_09.json"
  },
  {
    name: "Apr-Jun 2022",
    since: "2022-04-01",
    until: "2022-06-30",
    filename: "batch_2022_04_06.json"
  },
  {
    name: "Jan-Mar 2022",
    since: "2022-01-01",
    until: "2022-03-31",
    filename: "batch_2022_01_03.json"
  },
  {
    name: "Before 2022",
    since: "2020-01-01",  // Going back to 2020 to be safe
    until: "2021-12-31",
    filename: "batch_before_2022.json"
  }
];

async function collectBatch(client, batch, batchIndex, totalBatches) {
  const outputPath = path.join(BATCH_DIR, batch.filename);

  // Check if batch already exists
  if (await fs.pathExists(outputPath)) {
    const existingData = await fs.readJson(outputPath);
    if (existingData.tweets && existingData.tweets.length > 0) {
      console.log(`   ✓ Batch already collected: ${existingData.tweets.length} tweets`);
      return existingData.tweets.length;
    }
  }

  // Build search URL with date range
  const searchUrl = `https://twitter.com/search?q=from:${TWITTER_HANDLE} since:${batch.since} until:${batch.until}&f=live`;

  console.log(`   🔗 URL: ${searchUrl}`);

  // Configure the scraper
  const input = {
    startUrls: [searchUrl],
    searchTerms: [],
    twitterHandles: [],
    conversationIds: [],
    includeUserInfo: true,
    addUserInfo: true,
  };

  try {
    // Run the actor
    const run = await client.actor(ACTOR_ID).call(input, {
      memory: 512,
      timeout: 0,
      build: 'latest',
    });

    console.log(`   ⏳ Scraper started (Run ID: ${run.id})`);
    console.log(`   ⏳ Collecting tweets...`);

    // Get results
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`   📦 Received ${items.length} items`);

    // Transform to simplified format
    const simplifiedTweets = items.map(item => {
      let content = item.text || item.full_text || item.tweetText || item.content || '';
      let id = item.id || item.tweetId || item.id_str || `unknown_${Date.now()}_${Math.random()}`;
      let threadId = item.inReplyToId || item.in_reply_to_status_id_str || item.conversationId || null;

      // Handle retweets
      if ((item.isRetweet || item.retweeted) && item.retweetedTweet) {
        const rtAuthor = item.retweetedTweet.author?.userName ||
                       item.retweetedTweet.user?.screen_name ||
                       'unknown';
        const rtText = item.retweetedTweet.text ||
                     item.retweetedTweet.full_text ||
                     '';
        content = `RT @${rtAuthor}: ${rtText}`;
      }

      return {
        id: id,
        thread_id: threadId,
        content: content
      };
    });

    // Save batch data
    const batchData = {
      metadata: {
        batch_name: batch.name,
        date_range: `${batch.since} to ${batch.until}`,
        total_collected: simplifiedTweets.length,
        timestamp: new Date().toISOString()
      },
      tweets: simplifiedTweets
    };

    await fs.writeJson(outputPath, batchData, { spaces: 2 });
    console.log(`   ✅ Saved ${simplifiedTweets.length} tweets to ${batch.filename}`);

    return simplifiedTweets.length;

  } catch (error) {
    console.error(`   ❌ Error collecting batch: ${error.message}`);
    return 0;
  }
}

async function runBatchCollection() {
  console.log(`\n🏗️  Sand Batch Collection Starting...`);
  console.log(`📍 Target: @${TWITTER_HANDLE}`);
  console.log(`📊 Batches to process: ${batches.length}\n`);

  // Validate API token
  if (!APIFY_TOKEN || APIFY_TOKEN === 'your_apify_api_token_here') {
    console.error('❌ Error: Please set your APIFY_TOKEN in the .env file');
    process.exit(1);
  }

  // Ensure batch directory exists
  await fs.ensureDir(BATCH_DIR);

  // Initialize Apify client
  const client = new ApifyClient({
    token: APIFY_TOKEN,
  });

  let totalTweets = 0;
  let successfulBatches = 0;
  const startTime = Date.now();

  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n📅 Batch ${i + 1}/${batches.length}: ${batch.name}`);

    const tweetsCollected = await collectBatch(client, batch, i + 1, batches.length);

    if (tweetsCollected > 0) {
      totalTweets += tweetsCollected;
      successfulBatches++;
    }

    // Progress update
    const elapsed = (Date.now() - startTime) / 1000;
    const avgTimePerBatch = elapsed / (i + 1);
    const remainingBatches = batches.length - (i + 1);
    const estimatedTimeRemaining = avgTimePerBatch * remainingBatches;

    console.log(`   📊 Progress: ${totalTweets} tweets collected so far`);

    if (remainingBatches > 0) {
      console.log(`   ⏱️  Estimated time remaining: ${Math.round(estimatedTimeRemaining / 60)} minutes`);

      // Add delay between batches to avoid rate limiting
      console.log(`   💤 Waiting 5 seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 BATCH COLLECTION COMPLETE');
  console.log('='.repeat(50));
  console.log(`✅ Successful batches: ${successfulBatches}/${batches.length}`);
  console.log(`📝 Total tweets collected: ${totalTweets}`);
  console.log(`⏱️  Total time: ${Math.round((Date.now() - startTime) / 60000)} minutes`);
  console.log(`💰 Estimated cost: $${(totalTweets * 0.0004).toFixed(2)} (at $0.40/1000 tweets)`);
  console.log(`\n📁 Batches saved in: ${BATCH_DIR}`);
  console.log('\n🔄 Next step: Run "npm run merge" to combine all batches');
  console.log('='.repeat(50) + '\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Batch collection interrupted by user');
  console.log('💡 Progress has been saved. Re-run to continue from where you left off.\n');
  process.exit(0);
});

// Run the batch collector
runBatchCollection().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});