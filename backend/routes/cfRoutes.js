// Codeforces API Routes
const express = require('express');
const router = express.Router();
const { fetchCodeforcesUser, fetchCodeforcesAvatar } = require('../services/codeforcesService');

// GET /api/cf/user/:handle
router.get('/user/:handle', async (req, res) => {
  const { handle } = req.params;
  const forceRefresh = req.query.refresh === 'true';

  try {
    const result = await fetchCodeforcesUser(handle, forceRefresh);
    res.json({ success: true, data: result.data, fromCache: result.fromCache });
  } catch (error) {
    console.error(`Error in /api/cf/user/${handle}:`, error.message);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// GET /api/cf/avatar/:handle
router.get('/avatar/:handle', async (req, res) => {
  const { handle } = req.params;
  try {
    const { buffer, contentType } = await fetchCodeforcesAvatar(handle);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (error) {
    console.error(`Error in /api/cf/avatar/${handle}:`, error.message);
    res.status(500).send('Could not fetch avatar');
  }
});

module.exports = router;
