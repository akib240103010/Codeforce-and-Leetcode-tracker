# Codeforces & LeetCode Tracker

A unified, real-time analytics dashboard and competitive programming tracker for **Codeforces** and **LeetCode**. Track solved problems, contest ratings, upcoming contests with live countdowns, submission history, and compare coders side-by-side.

---

## ✨ Features

- **Unified Overview Dashboard**:
  - Combined problem-solving count (Codeforces + LeetCode).
  - Peak rating highlights across both platforms.
  - Live next-contest countdown ticker (Days, Hours, Minutes, Seconds).
  - Dual platform hero profiles with official rank color themes and badges (Guardian, Knight, Grandmaster, etc.).
  - Deep-linking URL parameter support (`?u=username`).

- **LeetCode Deep-Dive Analytics**:
  - Easy, Medium, and Hard solved breakdown with interactive **Donut Chart** and category progress bars.
  - Overall acceptance rate and total submission stats.
  - Contest Rating, Global Ranking (with total participants and percentile).
  - Interactive **Contest Rating History Line Chart** tracking rating changes over attended contests.
  - Recent accepted submissions feed with direct links to problems.
  - Accurate, timezone-aware daily streak engine.

- **Codeforces Deep-Dive Analytics**:
  - Official Rank, Max Rank, Current Rating, and Max Rating.
  - Interactive **Rating History Timeline** with contest performance tooltips.
  - **Solved Problem Rating Histogram** (distribution of problems solved from 800 to 3000+).
  - **Top Topics / Tags Chart** (Dynamic Programming, Greedy, Math, Graphs, Data Structures, etc.).
  - Recent Submissions table showing problem rating, verdict (Accepted, WA, TLE), language, time, and memory.

- **Upcoming Contests Calendar**:
  - Aggregated schedule for Codeforces (Div. 1, Div. 2, Div. 3, Educational) and LeetCode (Weekly, Biweekly).
  - Live countdown timers for each contest.
  - Direct contest registration links.
  - One-click **"Add to Google Calendar"** sync button.
  - Filter by platform (All, Codeforces, LeetCode).

- **Head-to-Head Comparison**:
  - Compare two coders side-by-side across ratings, peak performance, and questions solved.
  - Automatic leader calculation with trophy indicator.

- **Developer & User Convenience**:
  - Zero external CDN dependencies (browser tracking protection safe).
  - Dark mode and light mode toggling with local persistence.
  - One-click quick presets (`tourist`, `neal_wu`, `Benq`, `Petr`).
  - In-memory API cache (3 minutes) to ensure blazing fast response times without hitting external rate limits.
  - Double-click `start.bat` launcher for Windows.

---

## 📁 Project Structure

```text
├── backend/
│   ├── config/             # Configuration constants (PORT, cache TTL, headers)
│   ├── routes/             # Express API routes (/api/cf, /api/lc, /api/contests)
│   ├── services/           # External API clients and business logic (CF, LC, contests)
│   ├── utils/              # Helper utilities (streak engine, cache, avatar normalizer)
│   └── server.js           # Backend application setup and route mounting
├── public/                 # Static frontend application assets
│   ├── index.html          # Semantic HTML5 dashboard layout
│   ├── app.js              # Client controller, state, charts, and API client
│   ├── styles.css          # Custom styling, scrollbars, and animations
│   ├── tailwind.css        # Minified Tailwind CSS bundle (offline-capable)
│   ├── favicon.svg         # SVG favicon
│   └── vendor/             # Bundled local libraries (Chart.js, Lucide)
├── src/
│   └── input.css           # Tailwind source entry point
├── server.js               # Root server entry point
├── start.bat               # Windows one-click launcher
├── package.json            # Node.js dependencies and scripts
├── tailwind.config.js      # Tailwind configuration
├── .gitignore              # Git ignore rules
├── README.md               # Quickstart guide
└── PROJECT_REPORT.md       # Comprehensive architecture and technical report
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher)

### Installation
```bash
git clone https://github.com/<your-username>/codeforces-leetcode-tracker.git
cd codeforces-leetcode-tracker
npm install
```

### Running the App
1. **Option A (Command Line)**:
   ```bash
   npm start
   ```
   Then open [http://localhost:3000](http://localhost:3000) in your browser.

2. **Option B (One-Click Launcher on Windows)**:
   - Double-click `start.bat`. It will launch the server and open `http://localhost:3000` in your default browser.

3. **Development Mode**:
   ```bash
   npm run dev
   ```

4. **Rebuilding CSS**:
   ```bash
   npm run build:css
   ```

---

## 📚 Technical Documentation
For a deep dive into the architecture, streak calculation algorithm, API schemas, and test results, please refer to the comprehensive [PROJECT_REPORT.md](PROJECT_REPORT.md).

---

## 🛠️ Tech Stack
- **Backend**: Node.js & Express (API proxies to Codeforces REST API & LeetCode GraphQL, contest aggregator, and in-memory caching)
- **Frontend**: HTML5, Tailwind CSS, Chart.js, Lucide Icons, and Vanilla JavaScript (ES6+)
- **Fonts**: Plus Jakarta Sans & JetBrains Mono

---

## 📄 License
MIT License
