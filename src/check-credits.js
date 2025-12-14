// Detailed credit check for Apify account

require('dotenv').config();
const { ApifyClient } = require('apify-client');

async function checkCredits() {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    const client = new ApifyClient({ token: APIFY_TOKEN });

    try {
        const user = await client.user().get();

        console.log('🔍 Full Account Details:\n');
        console.log('Account:', user.username);
        console.log('Plan:', user.plan?.id);
        console.log('\n📊 Raw user data (all fields):');
        console.log(JSON.stringify(user, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkCredits();
