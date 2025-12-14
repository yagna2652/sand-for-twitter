const { ApifyClient } = require('apify-client');

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { handle, topic, from: fromDate, to: toDate, limit: limitStr } = req.query;
  const limit = parseInt(limitStr || '100');

  if (!handle) {
    return res.status(400).json({ error: 'no handle provided' });
  }

  console.log(`→ collecting @${handle}`);
  if (topic) console.log(`  topic: "${topic}"`);
  if (fromDate || toDate) console.log(`  range: ${fromDate || '...'} to ${toDate || '...'}`);
  console.log(`  limit: ${limit || 'all'}`);

  try {
    // When filtering by topic, fetch more tweets to search through
    // (Twitter search looks at ALL tweets, we can only fetch then filter)
    const fetchLimit = topic ? 3000 : (fromDate || toDate) ? 1000 : (limit || 100);

    const input = {
      handles: [handle],
      tweetsDesired: fetchLimit,
      includeRetweets: true,
    };

    const run = await client.actor('quacker/twitter-scraper').call(input, {
      timeout: 300000,
    });

    let { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`  ✓ got ${items.length} tweets`);

    // Apply filters
    if (topic) {
      const topicLower = topic.toLowerCase();
      items = items.filter(t => {
        const text = (t.text || t.full_text || '').toLowerCase();
        return text.includes(topicLower);
      });
      console.log(`  ✓ filtered to ${items.length} matching "${topic}"`);
    }

    if (fromDate) {
      const from = new Date(fromDate);
      items = items.filter(t => {
        const d = new Date(t.created_at || t.createdAt);
        return d >= from;
      });
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setDate(to.getDate() + 1);
      items = items.filter(t => {
        const d = new Date(t.created_at || t.createdAt);
        return d < to;
      });
    }

    if (fromDate || toDate) {
      console.log(`  ✓ date filtered to ${items.length} tweets`);
    }

    if (limit && limit > 0) {
      items = items.slice(0, limit);
    }

    const output = {
      handle,
      topic: topic || null,
      from: fromDate || null,
      to: toDate || null,
      collected_at: new Date().toISOString(),
      tweets: items.map(t => ({
        id: t.id,
        text: t.text || t.full_text || '',
        date: t.created_at || t.createdAt,
        url: t.url || `https://twitter.com/${handle}/status/${t.id}`,
      }))
    };

    return res.status(200).json(output);

  } catch (e) {
    console.error(`  ✗ error:`, e.message);
    return res.status(500).json({ error: e.message });
  }
};

