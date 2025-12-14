require('dotenv').config();
const http = require('http');
const { ApifyClient } = require('apify-client');
const fs = require('fs');
const path = require('path');

const PORT = 3847;
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>sand</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'IBM Plex Mono', monospace;
      background: #0a0a0a;
      color: #e5e5e5;
      min-height: 100vh;
      padding: 60px 24px;
    }
    
    .container {
      max-width: 560px;
      margin: 0 auto;
    }
    
    h1 {
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #525252;
      margin-bottom: 40px;
    }
    
    .field {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #525252;
      margin-bottom: 8px;
    }
    
    input, select {
      width: 100%;
      background: transparent;
      border: 1px solid #262626;
      padding: 12px 14px;
      font-family: inherit;
      font-size: 14px;
      color: #e5e5e5;
      outline: none;
      transition: border-color 0.2s;
    }
    
    input::placeholder { color: #404040; }
    input:focus, select:focus { border-color: #404040; }
    
    select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23525252'%3E%3Cpath d='M6 8L2 4h8z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
    }
    
    select option {
      background: #1a1a1a;
      color: #e5e5e5;
    }
    
    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    
    .actions {
      display: flex;
      gap: 12px;
      margin-top: 32px;
      margin-bottom: 24px;
    }
    
    button {
      background: #e5e5e5;
      color: #0a0a0a;
      border: none;
      padding: 12px 20px;
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.06em;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    
    button:hover { opacity: 0.85; }
    button:disabled { opacity: 0.3; cursor: not-allowed; }
    
    button.secondary {
      background: transparent;
      border: 1px solid #333;
      color: #a3a3a3;
    }
    
    button.secondary:hover { border-color: #525252; }
    
    .status {
      font-size: 12px;
      color: #525252;
      min-height: 18px;
    }
    
    .status.error { color: #ef4444; }
    .status.success { color: #22c55e; }
    .status.loading { color: #a3a3a3; }
    
    .results {
      border-top: 1px solid #1a1a1a;
      padding-top: 24px;
      margin-top: 24px;
    }
    
    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .count {
      font-size: 12px;
      color: #737373;
    }
    
    .tweet {
      padding: 14px 0;
      border-bottom: 1px solid #1a1a1a;
    }
    
    .tweet:last-child { border-bottom: none; }
    
    .tweet-text {
      font-size: 13px;
      line-height: 1.65;
      color: #d4d4d4;
      margin-bottom: 6px;
    }
    
    .tweet-meta {
      font-size: 11px;
      color: #404040;
    }
    
    .hint {
      font-size: 11px;
      color: #404040;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>sand · tweet collector</h1>
    
    <div class="field">
      <label>account</label>
      <input type="text" id="handle" placeholder="@handle" autocomplete="off" spellcheck="false">
    </div>
    
    <div class="field">
      <label>topic (optional)</label>
      <input type="text" id="topic" placeholder="keyword or phrase" autocomplete="off" spellcheck="false">
      <div class="hint">searches tweets containing this term</div>
    </div>
    
    <div class="row">
      <div class="field">
        <label>from</label>
        <input type="date" id="from">
      </div>
      <div class="field">
        <label>to</label>
        <input type="date" id="to">
      </div>
    </div>
    
    <div class="field">
      <label>limit</label>
      <select id="limit">
        <option value="20">20 tweets</option>
        <option value="50">50 tweets</option>
        <option value="100" selected>100 tweets</option>
        <option value="500">500 tweets</option>
        <option value="0">all tweets</option>
      </select>
    </div>
    
    <div class="actions">
      <button id="fetch">collect</button>
    </div>
    
    <div class="status" id="status"></div>
    
    <div class="results" id="results" style="display:none">
      <div class="results-header">
        <span class="count" id="count"></span>
        <button class="secondary" id="download">download json</button>
      </div>
      <div id="tweets"></div>
    </div>
  </div>

  <script>
    const handle = document.getElementById('handle');
    const topic = document.getElementById('topic');
    const fromDate = document.getElementById('from');
    const toDate = document.getElementById('to');
    const limit = document.getElementById('limit');
    const btn = document.getElementById('fetch');
    const status = document.getElementById('status');
    const results = document.getElementById('results');
    const count = document.getElementById('count');
    const tweets = document.getElementById('tweets');
    const downloadBtn = document.getElementById('download');
    
    let collectedData = null;
    
    // enter to submit
    [handle, topic].forEach(el => {
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter') btn.click();
      });
    });
    
    btn.addEventListener('click', async () => {
      let h = handle.value.trim().replace('@', '');
      if (!h) {
        status.className = 'status error';
        status.textContent = 'enter a handle';
        return;
      }
      
      btn.disabled = true;
      status.className = 'status loading';
      status.textContent = 'collecting...';
      results.style.display = 'none';
      collectedData = null;
      
      const params = new URLSearchParams({
        handle: h,
        topic: topic.value.trim(),
        from: fromDate.value,
        to: toDate.value,
        limit: limit.value
      });
      
      try {
        const res = await fetch('/collect?' + params);
        const data = await res.json();
        
        if (data.error) {
          status.className = 'status error';
          status.textContent = data.error;
        } else {
          collectedData = data;
          
          status.className = 'status success';
          status.textContent = 'done';
          
          count.textContent = data.tweets.length + ' tweets';
          tweets.innerHTML = data.tweets.slice(0, 30).map(t => \`
            <div class="tweet">
              <div class="tweet-text">\${escapeHtml(t.text)}</div>
              <div class="tweet-meta">\${formatDate(t.date)}</div>
            </div>
          \`).join('');
          
          if (data.tweets.length > 30) {
            tweets.innerHTML += '<div class="hint" style="padding:14px 0">showing 30 of ' + data.tweets.length + '</div>';
          }
          
          results.style.display = 'block';
        }
      } catch (e) {
        status.className = 'status error';
        status.textContent = 'connection failed';
      }
      
      btn.disabled = false;
    });
    
    downloadBtn.addEventListener('click', () => {
      if (!collectedData) return;
      
      const blob = new Blob([JSON.stringify(collectedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = collectedData.handle + '_tweets.json';
      a.click();
      URL.revokeObjectURL(url);
    });
    
    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    
    function formatDate(str) {
      if (!str) return '';
      try {
        const d = new Date(str);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch {
        return str;
      }
    }
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }
  
  if (url.pathname === '/collect') {
    const handle = url.searchParams.get('handle');
    const topic = url.searchParams.get('topic') || '';
    const fromDate = url.searchParams.get('from') || '';
    const toDate = url.searchParams.get('to') || '';
    const limit = parseInt(url.searchParams.get('limit') || '100');
    
    if (!handle) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'no handle provided' }));
      return;
    }
    
    // Build search query
    let searchQuery = `from:${handle}`;
    if (topic) searchQuery += ` ${topic}`;
    if (fromDate) searchQuery += ` since:${fromDate}`;
    if (toDate) searchQuery += ` until:${toDate}`;
    
    console.log(`\n→ collecting @${handle}`);
    if (topic) console.log(`  topic: "${topic}"`);
    if (fromDate || toDate) console.log(`  range: ${fromDate || '...'} to ${toDate || '...'}`);
    console.log(`  limit: ${limit || 'all'}`);
    console.log(`  query: ${searchQuery}`);
    
    try {
      // When filtering by topic, fetch more tweets to search through
      // (Twitter search looks at ALL tweets, we can only fetch then filter)
      const fetchLimit = topic ? 3000 : (fromDate || toDate) ? 1000 : (limit || 100);
      
      const input = {
        handles: [handle],
        tweetsDesired: fetchLimit,
        includeRetweets: true,
      };
      
      console.log(`  fetching up to ${fetchLimit} tweets...`);
      
      const run = await client.actor('quacker/twitter-scraper').call(input, {
        timeout: 300000, // 5 min timeout
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
        to.setDate(to.getDate() + 1); // include the end date
        items = items.filter(t => {
          const d = new Date(t.created_at || t.createdAt);
          return d < to;
        });
      }
      
      if (fromDate || toDate) {
        console.log(`  ✓ date filtered to ${items.length} tweets`);
      }
      
      // Apply final limit
      if (limit && limit > 0) {
        items = items.slice(0, limit);
      }
      
      // Transform results
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
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(output));
      
    } catch (e) {
      console.error(`  ✗ error:`, e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  
  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`\n  sand · http://localhost:${PORT}\n`);
});
