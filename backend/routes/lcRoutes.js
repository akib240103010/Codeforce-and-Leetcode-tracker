// LeetCode API Routes
const express = require('express');
const router = express.Router();
const { fetchLeetCodeUser, fetchLeetCodeAvatar } = require('../services/leetcodeService');

// GET /api/lc/user/:username
router.get('/user/:username', async (req, res) => {
  const { username } = req.params;
  const forceRefresh = req.query.refresh === 'true';

  try {
    const result = await fetchLeetCodeUser(username, forceRefresh);
    res.json({ success: true, data: result.data, fromCache: result.fromCache });
  } catch (error) {
    console.error(`Error in /api/lc/user/${username}:`, error.message);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// GET /api/lc/avatar/:username
router.get('/avatar/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const { buffer, contentType } = await fetchLeetCodeAvatar(username);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (error) {
    console.error(`Error in /api/lc/avatar/${username}:`, error.message);
    res.status(500).send('Could not fetch avatar');
  }
});

module.exports = router;
