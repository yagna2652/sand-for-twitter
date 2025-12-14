// Sand Tweet Collector - Alternative Apify Actor Configuration
// Testing different scraper configurations to get all 9,800 tweets

require('dotenv').config();
const { ApifyClient } = require('apify-client');
const fs = require('fs-extra');
const path = require('path');

// Configuration from environment
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const TWITTER_HANDLE = process.env.TWITTER_HANDLE;
const MAX_TWEETS = parseInt(process.env.MAX_TWEETS || '10000');

// Output path
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'raw', `${TWITTER_HANDLE}_raw_v2.json`);

async function collectTweetsV2() {
    console.log(`\n🏗️  Sand Collection Engine V2 - Testing Alternative Scrapers...`);
    console.log(`📍 Target: @${TWITTER_HANDLE}`);
    console.log(`📊 Goal: ~${MAX_TWEETS} tweets (Account shows 9,800 total)\n`);

    // Validate API token
    if (!APIFY_TOKEN || APIFY_TOKEN === 'your_apify_api_token_here') {
        console.error('❌ Error: Please set your APIFY_TOKEN in the .env file');
        process.exit(1);
    }

    // Initialize Apify client
    const client = new ApifyClient({
        token: APIFY_TOKEN,
    });

    // Try different actor configurations
    const actors = [
        {
            id: 'apidojo/X-Twitter-Scraper',
            name: 'X-Twitter-Scraper',
            input: {
                handles: [`@${TWITTER_HANDLE}`],
                maxTweets: MAX_TWEETS,
                includeReplies: true,
                includeRetweets: true,
            }
        },
        {
            id: 'apidojo/tweet-scraper',
            name: 'Tweet Scraper',
            input: {
                startUrls: [{url: `https://twitter.com/${TWITTER_HANDLE}`}],
                maxItems: MAX_TWEETS,
                includeReplies: true,
                includeRetweets: true,
                searchMode: 'user',
                userMode: 'tweets',
            }
        },
        {
            id: 'compass/twitter-profile-scraper',
            name: 'Twitter Profile Scraper',
            input: {
                usernames: [TWITTER_HANDLE],
                maxTweets: MAX_TWEETS,
                includeRetweets: true,
            }
        },
        {
            id: 'quacker/twitter-scraper',
            name: 'Quacker Twitter Scraper (with different params)',
            input: {
                handle: TWITTER_HANDLE,  // Try single handle
                handles: [TWITTER_HANDLE],  // Also try array
                mode: 'profile',  // Explicitly set profile mode
                tweetsDesired: MAX_TWEETS,
                maxTweets: MAX_TWEETS,  // Try both parameter names
                includeRetweets: true,
                includeReplies: true,
                addUserInfo: true,
                proxyConfig: {
                    useApifyProxy: true,
                },
            }
        }
    ];

    for (const actor of actors) {
        console.log(`\n🔍 Trying: ${actor.name} (${actor.id})`);
        console.log('Input configuration:', JSON.stringify(actor.input, null, 2));

        try {
            console.log('🚀 Starting scraper...');

            // Run the actor
            const run = await client.actor(actor.id).call(actor.input);

            console.log(`✅ Scraper started! Run ID: ${run.id}`);
            console.log('⏳ Waiting for results...\n');

            // Wait for the run to finish and get results
            const { items } = await client.dataset(run.defaultDatasetId).listItems();

            console.log(`📦 Results: ${items.length} items collected`);

            if (items.length > 200) {
                console.log(`✅ SUCCESS! Found ${items.length} tweets with ${actor.name}`);

                // Transform and save the data
                console.log('🔄 Transforming to Sand format...');

                const simplifiedTweets = items.map(item => {
                    // Handle different data structures from different scrapers
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
                        scraper: actor.name,
                        actor_id: actor.id,
                        total_collected: simplifiedTweets.length,
                        timestamp: new Date().toISOString()
                    },
                    tweets: simplifiedTweets
                };

                // Save to file
                console.log(`\n💾 Saving ${simplifiedTweets.length} tweets to: ${OUTPUT_PATH}`);
                await fs.ensureDir(path.dirname(OUTPUT_PATH));
                await fs.writeJson(OUTPUT_PATH, output, { spaces: 2 });

                console.log('\n✅ Collection complete with ' + actor.name);
                console.log(`📁 Output saved to: ${OUTPUT_PATH}\n`);
                return;
            } else {
                console.log(`❌ Only ${items.length} tweets found, trying next scraper...`);
            }

        } catch (error) {
            console.error(`❌ Error with ${actor.name}:`, error.message);
            console.log('Trying next scraper...');
        }
    }

    console.log('\n⚠️  All scrapers tested. If none collected enough tweets, you may need to:');
    console.log('1. Check if the account is private or has restrictions');
    console.log('2. Try a different Twitter scraper from Apify store');
    console.log('3. Use Twitter API directly (requires Twitter Developer account)');
    console.log('4. Check Apify store for updated scraper actors');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Collection interrupted by user');
    process.exit(0);
});

// Run the collector
collectTweetsV2().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});