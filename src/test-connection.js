// Quick test to verify Apify API connection

require('dotenv').config();
const { ApifyClient } = require('apify-client');

async function testConnection() {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;

    console.log('🔍 Testing Apify connection...\n');

    // Check if token exists
    if (!APIFY_TOKEN || APIFY_TOKEN === 'your_apify_api_token_here') {
        console.error('❌ APIFY_TOKEN not set in .env file');
        console.log('\n📝 To fix this:');
        console.log('1. Get your API token from: https://console.apify.com/account/integrations');
        console.log('2. Update the APIFY_TOKEN in your .env file');
        return false;
    }

    // Try to connect
    try {
        const client = new ApifyClient({ token: APIFY_TOKEN });

        // Test the connection by fetching user info
        const user = await client.user().get();

        console.log('✅ Connection successful!');
        console.log(`👤 Connected as: ${user.username}`);
        console.log(`📊 Plan: ${user.plan?.name || 'Free'}`);

        // Debug: Let's see all the user object fields
        console.log('\n📋 Debug - User object structure:');
        console.log(JSON.stringify(user, null, 2).substring(0, 1000));

        // Check multiple possible credit fields
        const credits = user.proxy?.totalCreditUsd ||
                       user.credit ||
                       user.currentBillingPeriod?.creditUsageUsd ||
                       user.currentCreditUsd ||
                       user.availableCredits ||
                       0;

        console.log(`\n💰 Credits: ${credits} USD`);

        // Show more detail if available
        if (user.currentBillingPeriod) {
            console.log(`   Usage: $${user.currentBillingPeriod.creditUsageUsd || 0} / $${user.currentBillingPeriod.creditLimitUsd || 0}`);
        }

        // Check if Twitter scraper is available
        console.log('\n🔍 Checking Twitter Scraper availability...');
        try {
            const actor = await client.actor('quacker/twitter-scraper').get();
            console.log('✅ Twitter Scraper found!');
            console.log(`   Version: ${actor.versions[0]?.versionNumber || 'latest'}`);
        } catch (error) {
            console.log('⚠️  Could not verify Twitter Scraper');
            console.log('   You may need to use a different actor ID');
        }

        return true;

    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.log('\n📝 Common issues:');
        console.log('- Invalid API token');
        console.log('- Network connection issues');
        console.log('- Apify service temporarily unavailable');
        return false;
    }
}

testConnection().then(success => {
    if (success) {
        console.log('\n🎉 Ready to collect tweets! Run: npm run collect');
    } else {
        console.log('\n⚠️  Fix the issues above before running the collector');
    }
});