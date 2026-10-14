// LeetCode Service: GraphQL API fetching, submissions stats, multi-year streak calculations, and contest ranking
const { BROWSER_HEADERS } = require('../config/constants');
const { getFromCache, setToCache } = require('../utils/cache');
const { normalizeAvatarUrl, isDefaultAvatarUrl, generateSvgAvatar } = require('../utils/avatar');
const { calculateStreaks } = require('../utils/streaks');

/**
 * Fetch and aggregate complete LeetCode profile and activity data
 * @param {string} username
 * @param {boolean} forceRefresh
 * @returns {Promise<object>}
 */
async function fetchLeetCodeUser(username, forceRefresh = false) {
  const cacheKey = `lc_${username.toLowerCase()}`;

  if (!forceRefresh) {
    const cached = getFromCache(cacheKey);
    if (cached) return { data: cached, fromCache: true };
  }

  const graphqlQuery = `
    query getUserFullProfile($username: String!) {
      matchedUser(username: $username) {
        username
        userCalendar {
          streak
          totalActiveDays
          activeYears
          submissionCalendar
        }
        submissionCalendar
        profile {
          ranking
          userAvatar
          realName
          aboutMe
          school
          countryName
          reputation
        }
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
          totalSubmissionNum {
            difficulty
            count
            submissions
          }
        }
        badges {
          id
          name
          displayName
          icon
        }
      }
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        totalParticipants
        topPercentage
        badge {
          name
        }
      }
      userContestRankingHistory(username: $username) {
        attended
        rating
        ranking
        trendDirection
        problemsSolved
        totalProblems
        contest {
          title
          startTime
        }
      }
      recentAcSubmissionList(username: $username, limit: 15) {
        id
        title
        titleSlug
        timestamp
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
    body: JSON.stringify({
      query: graphqlQuery,
      variables: { username }
    })
  });

  const lcJson = await lcRes.json();
  if (!lcJson.data?.matchedUser) {
    const err = new Error(`LeetCode user '${username}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const { matchedUser, userContestRanking, userContestRankingHistory, recentAcSubmissionList } = lcJson.data;

  let totalSolved = 0;
  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;

  const acList = matchedUser.submitStats?.acSubmissionNum || [];
  acList.forEach(item => {
    if (item.difficulty === 'All') totalSolved = item.count;
    else if (item.difficulty === 'Easy') easySolved = item.count;
    else if (item.difficulty === 'Medium') mediumSolved = item.count;
    else if (item.difficulty === 'Hard') hardSolved = item.count;
  });

  let totalSubmissions = 0;
  const totalList = matchedUser.submitStats?.totalSubmissionNum || [];
  totalList.forEach(item => {
    if (item.difficulty === 'All') totalSubmissions = item.submissions;
  });
  const acceptanceRate = totalSubmissions > 0 ? ((totalSolved / totalSubmissions) * 100).toFixed(1) : null;

  // Gather all submission timestamps for LeetCode across active years
  const lcTimestamps = [];
  const rawCal = matchedUser.userCalendar?.submissionCalendar || matchedUser.submissionCalendar;
  if (rawCal && rawCal !== '{}') {
    try {
      const cal = JSON.parse(rawCal);
      Object.keys(cal).forEach(sec => lcTimestamps.push(parseInt(sec, 10)));
    } catch (e) {
      console.warn('Could not parse LC submissionCalendar:', e.message);
    }
  }

  // Query past active years if available to ensure accurate lifetime maxStreak
  const activeYears = matchedUser.userCalendar?.activeYears || [];
  const currentYear = new Date().getFullYear();
  const pastActiveYears = activeYears.filter(y => y !== currentYear);

  if (pastActiveYears.length > 0) {
    try {
      const yearFetches = pastActiveYears.map(async (year) => {
        try {
          const yRes = await fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Referer': 'https://leetcode.com',
              ...BROWSER_HEADERS
            },
            body: JSON.stringify({
              query: `query getYearCal($username: String!, $year: Int!) {
                matchedUser(username: $username) {
                  userCalendar(year: $year) {
                    submissionCalendar
                  }
                }
              }`,
              variables: { username, year }
            })
          });
          const yData = await yRes.json();
          const yCal = yData.data?.matchedUser?.userCalendar?.submissionCalendar;
          if (yCal && yCal !== '{}') {
            const parsed = JSON.parse(yCal);
            Object.keys(parsed).forEach(sec => lcTimestamps.push(parseInt(sec, 10)));
          }
        } catch (err) {
          console.warn(`Failed to fetch LC calendar for year ${year}:`, err.message);
        }
      });

      await Promise.all(yearFetches);
    } catch (e) {
      console.warn('Error fetching LC past active years:', e.message);
    }
  }

  // Include recent AC submissions so same-day solves are registered immediately even if submissionCalendar is cached
  (recentAcSubmissionList || []).forEach(s => {
    if (s.timestamp) lcTimestamps.push(parseInt(s.timestamp, 10));
  });

  // Calculate streaks for LeetCode from all aggregated submission timestamps
  const lcStreakStats = calculateStreaks(lcTimestamps);
  const lcCurrentStreak = lcStreakStats.isAlive ? lcStreakStats.currentStreak : 0;
  const lcMaxStreak = Math.max(lcStreakStats.maxStreak, matchedUser.userCalendar?.streak || 0, lcCurrentStreak);
  const lcTotalActiveDays = Math.max(matchedUser.userCalendar?.totalActiveDays || 0, lcStreakStats.totalActiveDays);

  const contestHistory = (userContestRankingHistory || [])
    .filter(c => c.attended)
    .map(c => ({
      contestTitle: c.contest?.title || 'Contest',
      startTime: c.contest?.startTime || 0,
      date: c.contest?.startTime ? new Date(c.contest.startTime * 1000).toLocaleDateString() : '',
      rating: Math.round(c.rating || 0),
      ranking: c.ranking || null,
      problemsSolved: c.problemsSolved || null,
      totalProblems: c.totalProblems || null
    }));

  const formattedRecent = (recentAcSubmissionList || []).map(s => ({
    id: s.id,
    title: s.title,
    titleSlug: s.titleSlug,
    timestamp: parseInt(s.timestamp, 10),
    date: new Date(parseInt(s.timestamp, 10) * 1000).toLocaleString(),
    url: `https://leetcode.com/problems/${s.titleSlug}/`
  }));

  const rawLcAvatar = normalizeAvatarUrl(matchedUser.profile?.userAvatar || '');
  const isCustomLcAvatar = rawLcAvatar && !isDefaultAvatarUrl(rawLcAvatar);

  const payload = {
    profile: {
      username: matchedUser.username,
      realName: matchedUser.profile?.realName || '',
      ranking: matchedUser.profile?.ranking || 0,
      reputation: matchedUser.profile?.reputation || 0,
      avatar: isCustomLcAvatar ? rawLcAvatar : (rawLcAvatar || `/api/lc/avatar/${encodeURIComponent(matchedUser.username)}`),
      userAvatar: rawLcAvatar,
      avatarUrl: rawLcAvatar,
      rawAvatar: rawLcAvatar,
      proxyAvatar: `/api/lc/avatar/${encodeURIComponent(matchedUser.username)}`,
      school: matchedUser.profile?.school || '',
      country: matchedUser.profile?.countryName || '',
      aboutMe: matchedUser.profile?.aboutMe || '',
      badges: matchedUser.badges || []
    },
    stats: {
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      acceptanceRate,
      totalSubmissions,
      currentStreak: lcCurrentStreak,
      maxStreak: lcMaxStreak,
      totalActiveDays: lcTotalActiveDays,
      recentSubmissions: formattedRecent
    },
    contest: {
      rating: userContestRanking ? Math.round(userContestRanking.rating) : null,
      rawRating: userContestRanking?.rating || null,
      globalRanking: userContestRanking?.globalRanking || null,
      totalParticipants: userContestRanking?.totalParticipants || null,
      topPercentage: userContestRanking?.topPercentage || null,
      attendedContestsCount: userContestRanking?.attendedContestsCount || 0,
      badge: userContestRanking?.badge?.name || null,
      history: contestHistory
    }
  };

  setToCache(cacheKey, payload);
  return { data: payload, fromCache: false };
}

/**
 * Fetch and stream or generate LeetCode avatar image
 * @param {string} username
 * @returns {Promise<{ buffer: Buffer, contentType: string }>}
 */
async function fetchLeetCodeAvatar(username) {
  try {
    let targetUrl = '';
    const cached = getFromCache(`lc_${username.toLowerCase()}`);
    if (cached?.profile?.rawAvatar) {
      targetUrl = cached.profile.rawAvatar;
    } else {
      const q = `query getUserAvatar($username: String!) { matchedUser(username: $username) { profile { userAvatar } } }`;
      const lcRes = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com', ...BROWSER_HEADERS },
        body: JSON.stringify({ query: q, variables: { username } })
      });
      const lcData = await lcRes.json();
      targetUrl = normalizeAvatarUrl(lcData.data?.matchedUser?.profile?.userAvatar || '');
    }

    if (targetUrl && !targetUrl.includes('avatar_none.png')) {
      const imgRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': BROWSER_HEADERS['User-Agent'],
          'Referer': 'https://leetcode.com/'
        }
      });
      if (imgRes.ok) {
        const contentType = imgRes.headers.get('content-type') || 'image/png';
        const arrayBuffer = await imgRes.arrayBuffer();
        return { buffer: Buffer.from(arrayBuffer), contentType };
      }
    }
  } catch (err) {
    console.warn(`Could not proxy LC avatar for ${username}:`, err.message);
  }

  // Fallback SVG avatar
  return {
    buffer: Buffer.from(generateSvgAvatar(username, '#f59e0b', '#d97706')),
    contentType: 'image/svg+xml'
  };
}

module.exports = {
  fetchLeetCodeUser,
  fetchLeetCodeAvatar
};
