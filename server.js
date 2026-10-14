/**
 * Codeforces & LeetCode Tracker - Root Entry Point
 * Boots the modular Express application located in ./backend/server.js
 */
const app = require('./backend/server');
const { PORT } = require('./backend/config/constants');

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  Codeforces & LeetCode Tracker Server Running!`);
    console.log(`  Access the dashboard at: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
