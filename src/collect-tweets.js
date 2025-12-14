// Sand Tweet Collector - Apify Integration
// Collects tweets from specified Twitter/X handle for intellectual sparring material

require('dotenv').config();
const { ApifyClient } = require('apify-client');
const fs = require('fs-extra');
const path = require('path');

// Configuration from environment
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const TWITTER_HANDLE = process.env.TWITTER_HANDLE;
const MAX_TWEETS = parseInt(process.env.MAX_TWEETS || '10000');

// Output path
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'raw', `${TWITTER_HANDLE}_raw.json`);

// Twitter Scraper Actor ID - using apidojo/tweet-scraper for better results
const ACTOR_ID = 'apidojo/tweet-scraper';

async function collectTweets() {
    console.log(`\n🏗️  Sand Collection Engine Starting...`);
    console.log(`📍 Target: @${TWITTER_HANDLE}`);
    console.log(`📊 Goal: ~${MAX_TWEETS} tweets\n`);

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
        // Configure the Twitter scraper for apidojo/tweet-scraper
        // Matching exact console configuration that gave 776 tweets
        const input = {
            // Start URLs - this is what worked in console
            startUrls: [`https://twitter.com/${TWITTER_HANDLE}`],

            // Leave these empty as in console
            searchTerms: [],
            twitterHandles: [],
            conversationIds: [],

            // Any additional settings the actor might need
            includeUserInfo: true,
            addUserInfo: true,
        };

        console.log('🚀 Starting Apify Twitter Scraper...\n');

        // Run the actor with proper run options (matching console settings exactly)
        const run = await client.actor(ACTOR_ID).call(input, {
            memory: 512,  // 512 MB memory (as in console)
            timeout: 0,   // No timeout (as in console)
            build: 'latest',  // Use latest build (as in console)
        });

        console.log(`✅ Scraper started! Run ID: ${run.id}`);
        console.log('⏳ Collecting tweets... (this may take several minutes)\n');

        // Wait for the run to finish and get results
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        console.log(`\n📦 Raw data received: ${items.length} items`);

        // Transform to our simplified format
        console.log('🔄 Transforming to Sand format...');

        const simplifiedTweets = items.map(item => {
            // Build the content string including all relevant text
            let content = item.text || '';

            // If it's a retweet, include that information
            if (item.isRetweet && item.retweetedTweet) {
                content = `RT @${item.retweetedTweet.author?.userName || 'unknown'}: ${item.retweetedTweet.text || ''}`;
            }

            // If it's a quote tweet, include the quoted content
            if (item.quotedTweet) {
                content += ` QT: @${item.quotedTweet.author?.userName || 'unknown'}: ${item.quotedTweet.text || ''}`;
            }

            return {
                id: item.id || item.url?.split('/').pop() || `unknown_${Date.now()}`,
                thread_id: item.inReplyToId || null,
                content: content
            };
        });

        // Prepare final output
        const output = {
            tweets: simplifiedTweets
        };

        // Save to file
        console.log(`\n💾 Saving ${simplifiedTweets.length} tweets to: ${OUTPUT_PATH}`);
        await fs.ensureDir(path.dirname(OUTPUT_PATH));
        await fs.writeJson(OUTPUT_PATH, output, { spaces: 2 });

        // Summary statistics
        console.log('\n📊 Collection Summary:');
        console.log(`   Total tweets: ${simplifiedTweets.length}`);

        const threads = simplifiedTweets.filter(t => t.thread_id !== null).length;
        const standalone = simplifiedTweets.length - threads;
        console.log(`   Standalone: ${standalone}`);
        console.log(`   In threads: ${threads}`);

        const retweets = simplifiedTweets.filter(t => t.content.startsWith('RT @')).length;
        console.log(`   Retweets: ${retweets}`);

        console.log('\n✅ Sand collection complete! Raw thinking material ready for processing.');
        console.log(`📁 Output saved to: ${OUTPUT_PATH}\n`);

    } catch (error) {
        console.error('\n❌ Error during collection:', error.message);

        // Provide helpful error messages
        if (error.message.includes('token')) {
            console.error('💡 Tip: Check that your APIFY_TOKEN is valid in the .env file');
        } else if (error.message.includes('Actor not found')) {
            console.error('💡 Tip: The Twitter scraper actor ID may have changed. Check Apify store.');
        } else if (error.message.includes('rate limit')) {
            console.error('💡 Tip: You may have hit API rate limits. Try again later.');
        }

        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Collection interrupted by user');
    console.log('💡 Partial data may be available in the output directory\n');
    process.exit(0);
});

// Run the collector
collectTweets().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});