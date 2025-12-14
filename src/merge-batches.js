// Sand Batch Merger
// Combines all batch files into a single complete dataset

const fs = require('fs-extra');
const path = require('path');

// Directories
const BATCH_DIR = path.join(__dirname, '..', 'data', 'raw', 'batches');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'raw', 'ghuubear_complete.json');

async function mergeBatches() {
  console.log(`\n🔄 Sand Batch Merger Starting...`);
  console.log(`📁 Reading batches from: ${BATCH_DIR}\n`);

  try {
    // Ensure batch directory exists
    if (!await fs.pathExists(BATCH_DIR)) {
      console.error('❌ Error: Batch directory does not exist');
      console.log('   Run "npm run batch-collect" first to collect tweets in batches');
      process.exit(1);
    }

    // Get all batch files
    const files = await fs.readdir(BATCH_DIR);
    const batchFiles = files.filter(f => f.endsWith('.json'));

    if (batchFiles.length === 0) {
      console.error('❌ Error: No batch files found');
      console.log('   Run "npm run batch-collect" first to collect tweets in batches');
      process.exit(1);
    }

    console.log(`📊 Found ${batchFiles.length} batch files to merge\n`);

    // Collect all tweets from all batches
    let allTweets = [];
    const tweetIds = new Set();
    let duplicatesFound = 0;
    const batchStats = [];

    // Sort files to process in chronological order
    batchFiles.sort();

    for (const file of batchFiles) {
      const filePath = path.join(BATCH_DIR, file);
      console.log(`📖 Reading ${file}...`);

      try {
        const batchData = await fs.readJson(filePath);

        if (batchData.tweets && Array.isArray(batchData.tweets)) {
          const beforeCount = allTweets.length;
          let batchDuplicates = 0;

          // Add tweets, checking for duplicates
          for (const tweet of batchData.tweets) {
            if (!tweetIds.has(tweet.id)) {
              tweetIds.add(tweet.id);
              allTweets.push(tweet);
            } else {
              duplicatesFound++;
              batchDuplicates++;
            }
          }

          const addedCount = allTweets.length - beforeCount;
          console.log(`   ✅ Added ${addedCount} unique tweets (${batchDuplicates} duplicates skipped)`);

          batchStats.push({
            file: file,
            total: batchData.tweets.length,
            unique: addedCount,
            duplicates: batchDuplicates,
            dateRange: batchData.metadata?.date_range || 'Unknown'
          });
        } else {
          console.log(`   ⚠️  No tweets found in this batch`);
        }
      } catch (error) {
        console.error(`   ❌ Error reading ${file}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 MERGE STATISTICS');
    console.log('='.repeat(50));

    // Show batch statistics
    console.log('\n📅 Batches Processed:');
    for (const stat of batchStats) {
      console.log(`   ${stat.file}:`);
      console.log(`      Date range: ${stat.dateRange}`);
      console.log(`      Tweets: ${stat.total} (${stat.unique} unique, ${stat.duplicates} duplicates)`);
    }

    // Sort tweets by ID (which roughly corresponds to time)
    console.log('\n🔄 Sorting tweets chronologically...');
    allTweets.sort((a, b) => {
      // Twitter IDs are snowflake IDs that increase over time
      if (a.id < b.id) return 1;
      if (a.id > b.id) return -1;
      return 0;
    });

    // Analyze content
    const retweets = allTweets.filter(t => t.content.startsWith('RT @')).length;
    const threads = allTweets.filter(t => t.thread_id !== null).length;
    const original = allTweets.length - retweets;

    // Create final output
    const finalData = {
      metadata: {
        total_tweets: allTweets.length,
        unique_tweets: allTweets.length,
        duplicates_removed: duplicatesFound,
        batches_merged: batchFiles.length,
        date_merged: new Date().toISOString(),
        content_breakdown: {
          original_tweets: original,
          retweets: retweets,
          thread_replies: threads
        }
      },
      tweets: allTweets
    };

    // Save merged file
    console.log('\n💾 Saving complete dataset...');
    await fs.writeJson(OUTPUT_PATH, finalData, { spaces: 2 });

    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ MERGE COMPLETE!');
    console.log('='.repeat(50));
    console.log(`📝 Total unique tweets: ${allTweets.length}`);
    console.log(`🔄 Duplicates removed: ${duplicatesFound}`);
    console.log('\n📊 Content Breakdown:');
    console.log(`   Original tweets: ${original} (${Math.round(original / allTweets.length * 100)}%)`);
    console.log(`   Retweets: ${retweets} (${Math.round(retweets / allTweets.length * 100)}%)`);
    console.log(`   Thread replies: ${threads} (${Math.round(threads / allTweets.length * 100)}%)`);

    // Check if we got close to the expected 9,800 tweets
    if (allTweets.length >= 9000) {
      console.log('\n🎉 SUCCESS! Collected most/all of @ghuubear\'s tweets!');
    } else if (allTweets.length >= 5000) {
      console.log('\n✅ Good progress! Collected a substantial portion of tweets.');
      console.log('   You may want to add more date ranges to get older tweets.');
    } else {
      console.log('\n⚠️  Collected fewer tweets than expected.');
      console.log('   Consider extending date ranges or checking for gaps.');
    }

    console.log(`\n📁 Complete dataset saved to: ${OUTPUT_PATH}`);
    console.log('   File size: ' + ((await fs.stat(OUTPUT_PATH)).size / 1024 / 1024).toFixed(2) + ' MB');
    console.log('\n🚀 Ready for Sand processing and memory.store integration!');
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ Unexpected error during merge:', error);
    process.exit(1);
  }
}

// Run the merger
mergeBatches().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});