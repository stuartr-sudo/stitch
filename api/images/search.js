/**
 * Google Images Search API
 * Searches for images using SERP API or Google CSE
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  // Try SERP API first
  const SERP_API_KEY = process.env.SERP_API_KEY;
  if (SERP_API_KEY) {
    try {
      const response = await fetch(
        `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(query)}&api_key=${SERP_API_KEY}&num=20`
      );

      if (!response.ok) {
        throw new Error('SERP API request failed');
      }

      const data = await response.json();
      const images = (data.images_results || []).map(img => ({
        url: img.original,
        thumbnail: img.thumbnail,
        title: img.title,
        source: img.source,
      }));

      return res.status(200).json({ success: true, images });
    } catch (error) {
      console.error('[Image Search] SERP API error:', error);
    }
  }

  // Fallback to Google CSE
  const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY;
  const GOOGLE_CSE_CX = process.env.GOOGLE_CSE_CX;

  if (GOOGLE_CSE_API_KEY && GOOGLE_CSE_CX) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_API_KEY}&cx=${GOOGLE_CSE_CX}&q=${encodeURIComponent(query)}&searchType=image&num=10`
      );

      if (!response.ok) {
        throw new Error('Google CSE request failed');
      }

      const data = await response.json();
      const images = (data.items || []).map(item => ({
        url: item.link,
        thumbnail: item.image?.thumbnailLink,
        title: item.title,
        source: item.displayLink,
      }));

      return res.status(200).json({ success: true, images });
    } catch (error) {
      console.error('[Image Search] Google CSE error:', error);
    }
  }

  return res.status(500).json({ 
    error: 'Image search not configured. Please set SERP_API_KEY or GOOGLE_CSE_API_KEY/GOOGLE_CSE_CX.' 
  });
}
