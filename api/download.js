// api/download.js
// Vercel Serverless Function for scraping cartoons.lk pages
// Deploy to Vercel: Place this in /api/download.js
// Endpoint: https://your-vercel-app.vercel.app/api/download?url=https://cartoons.lk/alvin-and-the-chipmunks-sinhala-dubbed-movie/
// Handles GET requests with ?url= query param

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, error: 'Method not allowed' });
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ status: false, error: 'Missing url query parameter' });
  }

  // Validate URL (basic check for cartoons.lk)
  if (!url.startsWith('https://cartoons.lk/')) {
    return res.status(400).json({ status: false, error: 'Invalid URL domain' });
  }

  try {
    // Request headers from the provided example (adapt as needed)
    const headers = {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'purpose': 'prefetch',
      'sec-purpose': 'prefetch',
      'upgrade-insecure-requests': '1',
      'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-site': 'none',
      'sec-fetch-mode': 'no-cors',
      'sec-fetch-dest': 'empty',
      'referer': 'https://cartoons.lk/',
      'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,ar;q=0.7,si;q=0.6,zh-CN;q=0.5,zh;q=0.4',
    };

    // Cookies from the provided example (stringify for axios)
    const cookies = [
      'SITE_TOTAL_ID=aR02hJnYNxzKzKk5JvGoRQABjRI',
      '_ga=GA1.1.1780473608.1763522184',
      '_lscache_vary=6c5dbbe64bae8996d44349a065ba5e0e',
      'pp_main_fa490bee22e01898fce1478d89582fc1=1',
      '_ga_X1311K3XYS=GS2.1.s1764124535$o4$g0$t1764124535$j60$l0$h0',
      'pp_sub_fa490bee22e01898fce1478d89582fc1=1',
      'pp_delay_fa490bee22e01898fce1478d89582fc1=1',
      'dom3ic8zudi28v8lr6fgphwffqoz0j6c=0d151ded-1205-4d30-8f44-2dbcaa85410a%3A2%3A1'
    ].join('; ');

    headers['cookie'] = cookies;

    // Fetch the page
    const response = await axios.get(url, { headers });
    const html = response.data;

    // Parse with Cheerio
    const $ = cheerio.load(html);

    // Extract title (from og:title meta or h1)
    const title = $('meta[property="og:title"]').attr('content') || $('h1.post-title').text().trim();

    // Extract description (from og:description meta)
    const description = $('meta[property="og:description"]').attr('content') || '';

    // Extract image (from og:image meta)
    const image = $('meta[property="og:image"]').attr('content') || '';

    // Extract download link: Parse onclick from direct-download-btn
    // Look for: onclick="directDownload('https://files.cartoons.lk/...')
    let download = '';
    $('button.direct-download-btn').each((i, el) => {
      const onclick = $(el).attr('onclick');
      if (onclick && onclick.includes('directDownload(')) {
        // Extract URL from onclick string: directDownload('url')
        const match = onclick.match(/directDownload\('([^']+)'\)/);
        if (match) {
          download = match[1];
        }
      }
    });

    // If no download found, fallback to watch-online-btn (same URL in example)
    if (!download) {
      $('button.watch-online-btn').each((i, el) => {
        const onclick = $(el).attr('onclick');
        if (onclick && onclick.includes('openWatchOnlineWithQuality(')) {
          const match = onclick.match(/openWatchOnlineWithQuality\('([^']+)'/);
          if (match) {
            download = match[1];
          }
        }
      });
    }

    // Response JSON
    const result = {
      status: true,
      team: 'VISPER INC',
      creater: 'Pathum Rajapakshe',
      title: title || 'Unknown Title',
      description: description || 'No description available',
      image: image || '',
      download: download || 'No download link found'
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Scraper error:', error.message);
    res.status(500).json({ 
      status: false, 
      error: 'Failed to scrape page: ' + error.message 
    });
  }
};
