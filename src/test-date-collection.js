// Test Date-Based Tweet Collection
// Testing if apidojo/tweet-scraper can collect tweets from specific date ranges

require('dotenv').config();
const { ApifyClient } = require('apify-client');
const fs = require('fs-extra');
const path = require('path');

// Configuration from environment
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const TWITTER_HANDLE = process.env.TWITTER_HANDLE;

// Output path for test
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'raw', 'date_test_july_sept_2024.json');

// Actor ID
const ACTOR_ID = 'apidojo/tweet-scraper';

async function testDateCollection() {
    console.log(`\n🧪 Testing Date-Based Collection...`);
    console.log(`📍 Target: @${TWITTER_HANDLE}`);
    console.log(`📅 Date Range: July 1, 2024 - September 30, 2024\n`);

    // Validate API token
    if (!APIFY_TOKEN || APIFY_TOKEN === 'your_apify_api_token_here') {
        console.error('❌ Error: Please set your APIFY_TOKEN in the .env file');
        process.exit(1);
    }

    // Initialize Apify client
    const client = new ApifyClient({
        token: APIFY_TOKEN,
    });

    try {
        // Test with date-based search URL
        const searchUrl = `https://twitter.com/search?q=from:${TWITTER_HANDLE} since:2024-07-01 until:2024-09-30&f=live`;

        console.log(`🔗 Using search URL: ${searchUrl}`);

        // Configure the scraper with date-filtered URL
        const input = {
            startUrls: [searchUrl],
            searchTerms: [],
            twitterHandles: [],
            conversationIds: [],
            includeUserInfo: true,
            addUserInfo: true,
        };

        console.log('🚀 Starting Apify Twitter Scraper with date filter...\n');

        // Run with same settings as successful run
        const run = await client.actor(ACTOR_ID).call(input, {
            memory: 512,
            timeout: 0,
            build: 'latest',
        });

        console.log(`✅ Scraper started! Run ID: ${run.id}`);
        console.log('⏳ Collecting tweets from July-Sept 2024... (this may take several minutes)\n');

        // Wait for completion and get results
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        console.log(`\n📦 Raw data received: ${items.length} items`);

        // Transform to our simplified format
        console.log('🔄 Transforming to Sand format...');

        const simplifiedTweets = items.map(item => {
            let content = item.text || item.full_text || item.tweetText || item.content || '';
            let id = item.id || item.tweetId || item.id_str || `unknown_${Date.now()}`;
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

        const output = {
            metadata: {
                test_type: 'date_range_filter',
                date_range: 'July 1 - September 30, 2024',
                search_url: searchUrl,
                total_collected: simplifiedTweets.length,
                timestamp: new Date().toISOString()
            },
            tweets: simplifiedTweets
        };

        // Save to file
        console.log(`\n💾 Saving ${simplifiedTweets.length} tweets to: ${OUTPUT_PATH}`);
        await fs.ensureDir(path.dirname(OUTPUT_PATH));
        await fs.writeJson(OUTPUT_PATH, output, { spaces: 2 });

        // Analysis
        console.log('\n📊 Test Results:');
        console.log(`   Total tweets collected: ${simplifiedTweets.length}`);

        const retweets = simplifiedTweets.filter(t => t.content.startsWith('RT @')).length;
        const threads = simplifiedTweets.filter(t => t.thread_id !== null).length;

        console.log(`   Retweets: ${retweets}`);
        console.log(`   Thread replies: ${threads}`);
        console.log(`   Original tweets: ${simplifiedTweets.length - retweets - threads}`);

        // Check if we got different tweets
        if (simplifiedTweets.length > 0) {
            console.log('\n✅ SUCCESS! Date filtering appears to work!');
            console.log('   We can use this approach to collect tweets in batches.');

            // Show sample of first few tweets
            console.log('\n📝 Sample tweets from this date range:');
            simplifiedTweets.slice(0, 3).forEach((tweet, i) => {
                const preview = tweet.content.length > 100
                    ? tweet.content.substring(0, 100) + '...'
                    : tweet.content;
                console.log(`   ${i + 1}. ${preview}`);
            });
        } else {
            console.log('\n⚠️  No tweets found for this date range.');
            console.log('   This could mean:');
            console.log('   - The date filter syntax is different');
            console.log('   - The scraper doesn\'t support date filtering this way');
            console.log('   - No tweets in this date range');
        }

        console.log(`\n📁 Full output saved to: ${OUTPUT_PATH}\n`);

    } catch (error) {
        console.error('\n❌ Error during date range test:', error.message);
        process.exit(1);
    }
}

// Run the test
testDateCollection().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});