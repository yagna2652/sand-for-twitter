// Sand Mentions Collector
// Collects all tweets mentioning @Context7AI and extracts user information

require('dotenv').config();
const { ApifyClient } = require('apify-client');
const fs = require('fs-extra');
const path = require('path');

// Configuration from environment
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const MENTION_USERNAME = 'Context7AI';
const MAX_MENTIONS = parseInt(process.env.MAX_MENTIONS || '10');

// Output path
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'raw', `${MENTION_USERNAME}_mentions.json`);

// Actor ID - using the one that worked well for tweet collection
const ACTOR_ID = 'apidojo/tweet-scraper';

async function collectMentions() {
    console.log(`\n🏗️  Sand Mentions Collection Engine`);
    console.log(`📍 Target: @${MENTION_USERNAME}`);
    console.log(`📊 Goal: Collect tweets mentioning @${MENTION_USERNAME} with user info\n`);

    // Validate API token
    if (!APIFY_TOKEN || APIFY_TOKEN === 'your_apify_api_token_here') {
        console.error('❌ Error: Please set your APIFY_TOKEN in the .env file');
        process.exit(1);
    }

    // Initialize Apify client
    const client = new ApifyClient({
        token: APIFY_TOKEN,
    });

    // Build search URL for mentions
    const searchUrl = `https://twitter.com/search?q=@${MENTION_USERNAME}&f=live`;

    console.log(`🔍 Searching for: @${MENTION_USERNAME}`);
    console.log(`🔗 Search URL: ${searchUrl}\n`);

    // Configure the scraper
    const input = {
        startUrls: [searchUrl],
        searchTerms: [],
        twitterHandles: [],
        conversationIds: [],
        includeUserInfo: true,
        addUserInfo: true,
        maxItems: MAX_MENTIONS,
    };

    try {
        console.log('🚀 Starting scraper...');

        // Run the actor
        const run = await client.actor(ACTOR_ID).call(input, {
            memory: 512,
            timeout: 0,
            build: 'latest',
        });

        console.log(`✅ Scraper started! Run ID: ${run.id}`);
        console.log('⏳ Waiting for results...\n');

        // Wait for the run to finish and get results
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        console.log(`📦 Results: ${items.length} mentions collected`);

        if (items.length === 0) {
            console.log('\n⚠️  No mentions found. This could mean:');
            console.log('1. The account has not been mentioned recently');
            console.log('2. The search returned no results');
            console.log('3. Rate limiting or access issues');
            return;
        }

        // Transform and extract user information
        console.log('🔄 Extracting user information and mentions...\n');

        const mentionsWithUsers = items.map((item, index) => {
            // Extract tweet content
            let content = item.text || item.full_text || item.tweetText || item.content || '';
            let tweetId = item.id || item.tweetId || item.id_str || `unknown_${Date.now()}_${index}`;

            // Extract user information - handle various field name patterns
            const user = item.author || item.user || {};

            const username = user.userName ||
                           user.username ||
                           user.screen_name ||
                           user.screenName ||
                           'unknown';

            const displayName = user.name ||
                              user.displayName ||
                              user.full_name ||
                              username;

            const bio = user.description ||
                       user.bio ||
                       user.about ||
                       '';

            const followersCount = user.followers_count ||
                                 user.followersCount ||
                                 user.followers ||
                                 0;

            const followingCount = user.friends_count ||
                                 user.followingCount ||
                                 user.following ||
                                 0;

            const verified = user.verified ||
                           user.is_verified ||
                           false;

            const profileImage = user.profile_image_url_https ||
                               user.profilePicture ||
                               user.avatar ||
                               '';

            const createdAt = item.createdAt ||
                            item.created_at ||
                            item.timestamp ||
                            new Date().toISOString();

            return {
                tweet: {
                    id: tweetId,
                    content: content,
                    created_at: createdAt,
                },
                user: {
                    username: username,
                    display_name: displayName,
                    bio: bio,
                    followers_count: followersCount,
                    following_count: followingCount,
                    verified: verified,
                    profile_image_url: profileImage,
                }
            };
        });

        // Create summary statistics
        const uniqueUsers = new Set(mentionsWithUsers.map(m => m.user.username));

        console.log('📊 Collection Summary:');
        console.log(`   Total mentions: ${mentionsWithUsers.length}`);
        console.log(`   Unique users: ${uniqueUsers.size}`);
        console.log(`   Verified users: ${mentionsWithUsers.filter(m => m.user.verified).length}`);

        // Calculate average followers
        const totalFollowers = mentionsWithUsers.reduce((sum, m) => sum + m.user.followers_count, 0);
        const avgFollowers = totalFollowers / mentionsWithUsers.length;
        console.log(`   Average followers: ${Math.round(avgFollowers)}`);

        // Find top mentioners
        const mentionCounts = {};
        mentionsWithUsers.forEach(m => {
            mentionCounts[m.user.username] = (mentionCounts[m.user.username] || 0) + 1;
        });

        const topMentioners = Object.entries(mentionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        console.log('\n👥 Top 5 Mentioners:');
        topMentioners.forEach(([username, count]) => {
            console.log(`   @${username}: ${count} mentions`);
        });

        // Prepare output data
        const output = {
            metadata: {
                target: `@${MENTION_USERNAME}`,
                total_mentions: mentionsWithUsers.length,
                unique_users: uniqueUsers.size,
                verified_users_count: mentionsWithUsers.filter(m => m.user.verified).length,
                average_followers: Math.round(avgFollowers),
                top_mentioners: topMentioners.map(([username, count]) => ({ username, count })),
                timestamp: new Date().toISOString(),
                scraper: ACTOR_ID,
            },
            mentions: mentionsWithUsers
        };

        // Save to file
        console.log(`\n💾 Saving ${mentionsWithUsers.length} mentions to: ${OUTPUT_PATH}`);
        await fs.ensureDir(path.dirname(OUTPUT_PATH));
        await fs.writeJson(OUTPUT_PATH, output, { spaces: 2 });

        console.log('\n✅ Mentions collection complete!');
        console.log(`📁 Output saved to: ${OUTPUT_PATH}`);

        // Show sample of users
        console.log('\n📋 Sample of collected users (first 3):');
        mentionsWithUsers.slice(0, 3).forEach((mention, i) => {
            console.log(`\n   ${i + 1}. @${mention.user.username} (${mention.user.display_name})`);
            console.log(`      Bio: ${mention.user.bio.substring(0, 80)}${mention.user.bio.length > 80 ? '...' : ''}`);
            console.log(`      Followers: ${mention.user.followers_count}`);
            console.log(`      Tweet: "${mention.tweet.content.substring(0, 100)}${mention.tweet.content.length > 100 ? '...' : ''}"`);
        });

        console.log('\n');

    } catch (error) {
        console.error(`❌ Error collecting mentions:`, error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Collection interrupted by user');
    process.exit(0);
});

// Run the collector
collectMentions().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
