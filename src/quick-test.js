// Quick test with minimal tweets to see if scraper actually works

require('dotenv').config();
const { ApifyClient } = require('apify-client');

async function quickTest() {
    console.log('🧪 Testing if scraper works despite API warnings...\n');

    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    const client = new ApifyClient({ token: APIFY_TOKEN });

    try {
        console.log('🚀 Attempting to run scraper with 5 tweets only...');

        // Try the simplest actor with minimal request
        const run = await client.actor('quacker/twitter-scraper').call({
            handles: ['ghuubear'],
            tweetsDesired: 5,
            includeRetweets: false,
        }, {
            timeout: 60000, // 60 second timeout
        });

        console.log(`✅ Run started! ID: ${run.id}`);
        console.log(`📊 Status: ${run.status}`);

        // Get results
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        console.log(`\n✅ SUCCESS! Collected ${items.length} tweets`);
        console.log('\nFirst tweet:');
        console.log(JSON.stringify(items[0], null, 2).substring(0, 500));

        return true;

    } catch (error) {
        console.error('\n❌ Scraper failed:', error.message);

        if (error.message.includes('unpaid') || error.message.includes('invoice') || error.message.includes('disabled')) {
            console.log('\n🔴 Account is definitely blocked. You need to:');
            console.log('1. Contact Apify support about the unpaid invoice issue');
            console.log('2. Or create a brand new account with a different email');
        }

        return false;
    }
}

quickTest();
