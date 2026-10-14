// Contest Service: Aggregates upcoming contests from Codeforces and LeetCode
const { BROWSER_HEADERS } = require('../config/constants');
const { getFromCache, setToCache } = require('../utils/cache');

/**
 * Fetch upcoming contests from both platforms
 * @param {boolean} forceRefresh
 * @returns {Promise<Array<object>>}
 */
async function fetchUpcomingContests(forceRefresh = false) {
  const cacheKey = 'upcoming_contests';

  if (!forceRefresh) {
    const cached = getFromCache(cacheKey);
    if (cached) return cached;
  }

  const contests = [];
  const now = Math.floor(Date.now() / 1000);

  // 1. Codeforces contests
  try {
    const cfRes = await fetch('https://codeforces.com/api/contest.list?gym=false', { headers: BROWSER_HEADERS });
    const cfData = await cfRes.json();
    if (cfData.status === 'OK' && Array.isArray(cfData.result)) {
      const upcomingCf = cfData.result
        .filter(c => c.phase === 'BEFORE')
        .map(c => ({
          platform: 'Codeforces',
          id: `cf-${c.id}`,
          title: c.name,
          type: c.type || 'CF',
          startTime: c.startTimeSeconds,
          duration: c.durationSeconds,
          remainingSeconds: c.startTimeSeconds - now,
          url: `https://codeforces.com/contests/${c.id}`
        }));
      contests.push(...upcomingCf);
    }
  } catch (err) {
    console.warn('Failed to fetch Codeforces contests:', err.message);
  }

  // 2. LeetCode contests
  try {
    const lcQuery = `
      query topTwoContests {
        topTwoContests {
          title
          titleSlug
          startTime
          duration
          originStartTime
        }
      }
    `;
    const lcRes = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
        ...BROWSER_HEADERS
      },
      body: JSON.stringify({ query: lcQuery })
    });
    const lcData = await lcRes.json();
    if (lcData.data?.topTwoContests) {
      const upcomingLc = lcData.data.topTwoContests
        .filter(c => c.startTime > now)
        .map(c => ({
          platform: 'LeetCode',
          id: `lc-${c.titleSlug}`,
          title: c.title,
          type: c.title.includes('Biweekly') ? 'Biweekly' : 'Weekly',
          startTime: c.startTime,
          duration: c.duration,
          remainingSeconds: c.startTime - now,
          url: `https://leetcode.com/contest/${c.titleSlug}`
        }));
      contests.push(...upcomingLc);
    }
  } catch (err) {
    console.warn('Failed to fetch LeetCode contests:', err.message);
  }

  // Sort chronologically
  contests.sort((a, b) => a.startTime - b.startTime);

  setToCache(cacheKey, contests);
  return contests;
}

module.exports = {
  fetchUpcomingContests
};
