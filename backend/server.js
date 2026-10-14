// Backend Server Express Application
const express = require('express');
const path = require('path');
const { PORT } = require('./config/constants');

// Import Route Handlers
const cfRoutes = require('./routes/cfRoutes');
const lcRoutes = require('./routes/lcRoutes');
const contestRoutes = require('./routes/contestRoutes');

const app = express();

// Body Parser Middleware
app.use(express.json());

// Serve Static Frontend Assets
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Serve Local Vendor Libraries (Offline Fallbacks)
app.use('/vendor/chart.js', express.static(path.join(__dirname, '../node_modules/chart.js/dist')));
app.use('/vendor/lucide', express.static(path.join(__dirname, '../node_modules/lucide/dist/umd')));

// Mount API Endpoints
app.use('/api/cf', cfRoutes);
app.use('/api/lc', lcRoutes);
app.use('/api/contests', contestRoutes);

// Catch-All Handler to serve index.html for frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start Server when run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  Codeforces & LeetCode Tracker Server Running!`);
    console.log(`  Access the dashboard at: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
