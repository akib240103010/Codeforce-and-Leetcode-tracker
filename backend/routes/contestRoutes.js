// Upcoming Contests Routes
const express = require('express');
const router = express.Router();
const { fetchUpcomingContests } = require('../services/contestService');

// GET /api/contests
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

module.exports = router;
