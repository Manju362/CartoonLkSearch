// api/download.js
// ESM-compatible Vercel Serverless Function
// Endpoint: https://cartoonlkDl.vercel.app/api/download?url=https://cartoons.lk/alvin-and-the-chipmunks-sinhala-dubbed-movie/

import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ status: false, error: 'Method not allowed' });
  }

  const { url } = req.query;
  if (!url) {
    console.log('Missing URL param');
    return res.status(400).json({ status: false, error: 'Missing url query parameter' });
  }

  // Validate URL
  if (!url.startsWith('https://cartoons.lk/')) {
    console.log('Invalid domain:', url);
    return res.status(400).json({ status: false, error: 'Invalid URL domain' });
  }

  try {
    console.log('Starting scrape for URL:', url);

    // Updated headers (fresher UA, no old cookies—site may rotate them)
    const headers = {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'upgrade-insecure-requests': '1',
      'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not?A_Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'accept-language': 'en-US,en;q=0.9',
    };

    // Minimal cookies (omit old ones—fetch fresh if needed via browser)
    headers['cookie'] = 'SITE_TOTAL_ID=aR02hJnYNxzKzKk5JvGoRQABjRI; _ga=GA1.1.1780473608.1763522184';

    // Fetch page
    console.log('Fetching page...');
    const { data: html } = await axios.get(url, { 
      headers, 
      timeout: 10000,  // 10s timeout
      decompress: true 
    });
    console.log('Page fetched, length:', html.length);

    // Parse with Cheerio
    const $ = cheerio.load(html);
    console.log('HTML parsed');

    // Extract title
    let title = $('meta[property="og:title"]').attr('content') || $('h1.post-title').text().trim() || 'Unknown Title';
    console.log('Extracted title:', title);

    // Extract description
    let description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    console.log('Extracted description:', description ? 'Found' : 'Empty');

    // Extract image
    let image = $('meta[property="og:image"]').attr('content') || '';
    console.log('Extracted image:', image);

    // Extract download link
    let download = '';
    $('button.direct-download-btn').each((i, el) => {
      const onclick = $(el).attr('onclick');
      if (onclick && onclick.includes('directDownload(')) {
        const match = onclick.match(/directDownload\('([^']+)'\)/);
        if (match) {
          download = match[1];
          console.log('Found download via direct-download-btn:', download);
        }
      }
    });

    // Fallback to watch-online-btn
    if (!download) {
      $('button.watch-online-btn').each((i, el) => {
        const onclick = $(el).attr('onclick');
        if (onclick && onclick.includes('openWatchOnlineWithQuality(')) {
          const match = onclick.match(/openWatchOnlineWithQuality\('([^']+)'/);
          if (match) {
            download = match[1];
            console.log('Found download via watch-online-btn:', download);
          }
        }
      });
    }

    if (!download) {
      console.log('No download link found');
    }

    // Response
    const result = {
      status: true,
      team: 'VISPER INC',
      creater: 'Pathum Rajapakshe',
      title,
      description,
      image,
      download: download || 'No download link found'
    };

    console.log('Success response:', JSON.stringify(result));
    res.status(200).json(result);

  } catch (error) {
    console.error('Full error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    res.status(500).json({ 
      status: false, 
      error: 'Scrape failed: ' + (error.message || 'Unknown error') 
    });
  }
}
