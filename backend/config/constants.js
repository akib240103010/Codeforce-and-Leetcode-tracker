// Application Configuration and Constants
const PORT = process.env.PORT || 3000;

// In-memory cache TTL (in milliseconds)
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

// Standard browser headers for upstream API requests
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*'
};

module.exports = {
  PORT,
  CACHE_TTL,
  BROWSER_HEADERS
};
