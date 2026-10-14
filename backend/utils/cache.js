// In-Memory Key-Value Cache with Time-to-Live (TTL)
const { CACHE_TTL } = require('../config/constants');

const cache = new Map();

/**
 * Retrieve item from cache if not expired
 * @param {string} key
 * @returns {any|null}
 */
function getFromCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > item.ttl) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

/**
 * Store item in cache with TTL
 * @param {string} key
 * @param {any} data
 * @param {number} ttl
 */
function setToCache(key, data, ttl = CACHE_TTL) {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

/**
 * Delete a specific key from cache
 * @param {string} key
 */
function deleteFromCache(key) {
  cache.delete(key);
}

/**
 * Clear entire in-memory cache
 */
function clearCache() {
  cache.clear();
}

module.exports = {
  getFromCache,
  setToCache,
  deleteFromCache,
  clearCache
};
