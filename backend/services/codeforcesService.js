// Codeforces Service: API fetching, profile parsing, submissions analysis, and rating history
const { BROWSER_HEADERS } = require('../config/constants');
const { getFromCache, setToCache } = require('../utils/cache');
const { normalizeAvatarUrl, isDefaultAvatarUrl, generateSvgAvatar } = require('../utils/avatar');
const { calculateStreaks } = require('../utils/streaks');

/**
 * Fetch and aggregate complete Codeforces profile and activity data
 * @param {string} handle
 * @param {boolean} forceRefresh
 * @returns {Promise<object>}
 */
async function fetchCodeforcesUser(handle, forceRefresh = false) {
  const cacheKey = `cf_${handle.toLowerCase()}`;

  if (!forceRefresh) {
    const cached = getFromCache(cacheKey);
    if (cached) return { data: cached, fromCache: true };
  }

  // 1. Fetch user info
  const infoRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`, {
    headers: BROWSER_HEADERS
  });
  const infoData = await infoRes.json();
  if (infoData.status !== 'OK' || !infoData.result?.length) {
    const err = new Error(`Codeforces user '${handle}' not found.`);
    err.statusCode = 404;
    throw err;
  }
  const profile = infoData.result[0];

  // 2. Fetch rating history
  let ratingHistory = [];
  try {
    const ratingRes = await fetch(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`, {
      headers: BROWSER_HEADERS
    });
    const ratingData = await ratingRes.json();
    if (ratingData.status === 'OK') {
      ratingHistory = ratingData.result.map(c => ({
        contestId: c.contestId,
        contestName: c.contestName,
        rank: c.rank,
        oldRating: c.oldRating,
        newRating: c.newRating,
        ratingChange: c.newRating - c.oldRating,
        ratingUpdateTimeSeconds: c.ratingUpdateTimeSeconds,
        date: new Date(c.ratingUpdateTimeSeconds * 1000).toLocaleDateString()
      }));
    }
  } catch (err) {
    console.warn(`Failed to fetch CF rating history for ${handle}:`, err.message);
  }

  // 3. Fetch submissions (up to 1000)
  let solvedProblems = new Map();
  let tagStats = {};
  let ratingDistribution = {};
  let verdictStats = {};
  let recentSubmissions = [];
  let cfSubmissionDates = [];

  try {
    const statusRes = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=1000`, {
      headers: BROWSER_HEADERS
    });
    const statusData = await statusRes.json();
    if (statusData.status === 'OK') {
      const subs = statusData.result || [];
      
      // Recent 20 submissions
      recentSubmissions = subs.slice(0, 20).map(s => ({
        id: s.id,
        contestId: s.contestId,
        problemIndex: s.problem.index,
        problemName: s.problem.name,
        problemRating: s.problem.rating || null,
        verdict: s.verdict,
        programmingLanguage: s.programmingLanguage,
        timeConsumedMillis: s.timeConsumedMillis,
        memoryConsumedBytes: s.memoryConsumedBytes,
        creationTimeSeconds: s.creationTimeSeconds,
        url: s.contestId 
          ? `https://codeforces.com/contest/${s.contestId}/problem/${s.problem.index}`
          : `https://codeforces.com/problemset/problem/${s.problem.contestId || ''}/${s.problem.index}`
      }));

      subs.forEach(s => {
        verdictStats[s.verdict] = (verdictStats[s.verdict] || 0) + 1;

        // Track submission timestamps for streaks
        if (s.creationTimeSeconds) {
          cfSubmissionDates.push(s.creationTimeSeconds);
        }

        if (s.verdict === 'OK') {
          const problemId = s.problem.contestId ? `${s.problem.contestId}-${s.problem.index}` : s.problem.name;
          if (!solvedProblems.has(problemId)) {
            solvedProblems.set(problemId, s.problem);

            if (s.problem.rating) {
              const r = s.problem.rating;
              ratingDistribution[r] = (ratingDistribution[r] || 0) + 1;
            }

            if (Array.isArray(s.problem.tags)) {
              s.problem.tags.forEach(tag => {
                tagStats[tag] = (tagStats[tag] || 0) + 1;
              });
            }
          }
        }
      });
    }
  } catch (err) {
    console.warn(`Failed to fetch CF submissions for ${handle}:`, err.message);
  }

  const sortedTags = Object.entries(tagStats)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  const rawAvatar = normalizeAvatarUrl(profile.avatar || '');
  const rawTitlePhoto = normalizeAvatarUrl(profile.titlePhoto || '');
  const isCustomAvatar = rawAvatar && !isDefaultAvatarUrl(rawAvatar);
  const isCustomTitle = rawTitlePhoto && !isDefaultAvatarUrl(rawTitlePhoto);

  // Pick best active avatar and title photo
  const resolvedAvatar = isCustomAvatar ? rawAvatar : (isCustomTitle ? rawTitlePhoto : (rawAvatar || rawTitlePhoto || ''));
  const resolvedTitlePhoto = isCustomTitle ? rawTitlePhoto : (isCustomAvatar ? rawAvatar : (rawTitlePhoto || rawAvatar || ''));

  // Calculate streaks for Codeforces
  const cfStreaks = calculateStreaks(cfSubmissionDates);

  // Format response payload
  const payload = {
    profile: {
      handle: profile.handle,
      rank: profile.rank || 'Unrated',
      maxRank: profile.maxRank || 'Unrated',
      rating: profile.rating || 0,
      maxRating: profile.maxRating || 0,
      avatar: resolvedAvatar,
      titlePhoto: resolvedTitlePhoto,
      avatarUrl: resolvedAvatar,
      photoUrl: resolvedTitlePhoto,
      rawAvatar: rawAvatar,
      rawTitlePhoto: rawTitlePhoto,
      rawThumbnail: rawAvatar || rawTitlePhoto,
      proxyAvatar: `/api/cf/avatar/${encodeURIComponent(profile.handle)}`,
      friendOfCount: profile.friendOfCount || 0,
      contribution: profile.contribution || 0,
      organization: profile.organization || '',
      city: profile.city || '',
      country: profile.country || '',
      registrationTimeSeconds: profile.registrationTimeSeconds
    },
    stats: {
      totalSolved: solvedProblems.size,
      currentStreak: cfStreaks.currentStreak,
      maxStreak: cfStreaks.maxStreak,
      totalActiveDays: cfStreaks.totalActiveDays,
      ratingDistribution,
      tagStats: sortedTags,
      verdictStats,
      recentSubmissions
    },
    ratingHistory
  };

  setToCache(cacheKey, payload);
  return { data: payload, fromCache: false };
}

/**
 * Fetch and stream or generate Codeforces avatar image
 * @param {string} handle
 * @returns {Promise<{ buffer: Buffer, contentType: string }>}
 */
async function fetchCodeforcesAvatar(handle) {
  try {
    let targetUrl = '';
    const cached = getFromCache(`cf_${handle.toLowerCase()}`);
    if (cached?.profile) {
      const p = cached.profile;
      const candidates = [p.avatar, p.titlePhoto, p.rawAvatar, p.rawTitlePhoto];
      for (const cand of candidates) {
        if (cand && !isDefaultAvatarUrl(cand) && cand.startsWith('http')) {
          targetUrl = normalizeAvatarUrl(cand);
          break;
        }
      }
      if (!targetUrl) {
        for (const cand of candidates) {
          if (cand && cand.startsWith('http')) {
            targetUrl = normalizeAvatarUrl(cand);
            break;
          }
        }
      }
    }

    if (!targetUrl) {
      const infoRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`, {
        headers: BROWSER_HEADERS
      });
      const infoData = await infoRes.json();
      if (infoData.status === 'OK' && infoData.result?.length) {
        const u = infoData.result[0];
        const candidates = [u.avatar, u.titlePhoto];
        for (const cand of candidates) {
          const norm = normalizeAvatarUrl(cand);
          if (norm && !isDefaultAvatarUrl(norm)) {
            targetUrl = norm;
            break;
          }
        }
        if (!targetUrl) {
          targetUrl = normalizeAvatarUrl(u.avatar || u.titlePhoto || '');
        }
      }
    }

    if (targetUrl) {
      const imgRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': BROWSER_HEADERS['User-Agent'],
          'Referer': 'https://codeforces.com/',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });
      if (imgRes.ok) {
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await imgRes.arrayBuffer();
        return { buffer: Buffer.from(arrayBuffer), contentType };
      }
    }
  } catch (err) {
    console.warn(`Could not proxy CF avatar for ${handle}:`, err.message);
  }

  // Fallback SVG avatar
  return {
    buffer: Buffer.from(generateSvgAvatar(handle, '#3b82f6', '#1d4ed8')),
    contentType: 'image/svg+xml'
  };
}

module.exports = {
  fetchCodeforcesUser,
  fetchCodeforcesAvatar
};
