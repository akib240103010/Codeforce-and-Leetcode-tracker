// Upcoming Contests and In-App Registration Routes
const express = require('express');
const router = express.Router();
const { fetchUpcomingContests } = require('../services/contestService');
const {
  verifyCodeforcesSession,
  verifyLeetCodeSession,
  registerCodeforcesContest,
  registerLeetCodeContest
} = require('../services/registrationService');

// GET /api/contests - Fetch aggregated upcoming contests
router.get('/', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  try {
    const contests = await fetchUpcomingContests(forceRefresh);
    res.json({ success: true, data: contests });
  } catch (error) {
    console.error('Error in /api/contests:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/contests/verify-session - Test if user session cookies are valid
router.post('/verify-session', async (req, res) => {
  const { platform, cookie } = req.body || {};

  if (!platform || !cookie) {
    return res.status(400).json({ success: false, error: 'Platform and session cookie are required.' });
  }

  try {
    if (platform.toLowerCase() === 'codeforces') {
      const result = await verifyCodeforcesSession(cookie);
      return res.json({ success: result.valid, ...result });
    } else if (platform.toLowerCase() === 'leetcode') {
      const result = await verifyLeetCodeSession(cookie);
      return res.json({ success: result.valid, ...result });
    } else {
      return res.status(400).json({ success: false, error: 'Invalid platform. Choose Codeforces or LeetCode.' });
    }
  } catch (error) {
    console.error('Error in /api/contests/verify-session:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/contests/register - Execute contest registration via proxy
router.post('/register', async (req, res) => {
  const { platform, contestId, contestSlug, contestTitle, cookie } = req.body || {};

  if (!platform) {
    return res.status(400).json({ success: false, error: 'Platform is required.' });
  }

  try {
    if (platform.toLowerCase() === 'codeforces') {
      if (!contestId) {
        return res.status(400).json({ success: false, error: 'Contest ID is required for Codeforces registration.' });
      }
      const result = await registerCodeforcesContest(contestId, cookie, contestTitle);
      return res.json(result);
    } else if (platform.toLowerCase() === 'leetcode') {
      const slug = contestSlug || contestId;
      if (!slug) {
        return res.status(400).json({ success: false, error: 'Contest slug is required for LeetCode registration.' });
      }
      const result = await registerLeetCodeContest(slug, cookie, contestTitle);
      return res.json(result);
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported contest platform.' });
    }
  } catch (error) {
    console.error('Error in /api/contests/register:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
