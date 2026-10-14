# Project Report: Unified Codeforces & LeetCode Tracker

> **Project Name:** Unified Codeforces & LeetCode Tracker  
> **Repository Ready:** Prepared for GitHub Upload  
> **Tech Stack:** Node.js, Express, Vanilla JavaScript (ES6+), Tailwind CSS, Chart.js, Lucide Icons  
> **Date:** October 2026  

---

## 1. Project Overview

The **Unified Codeforces & LeetCode Tracker** is a production-grade, privacy-conscious web application designed for competitive programmers and software engineers. It aggregates live performance metrics, contest ratings, problem-solving statistics, submission feeds, and upcoming contest schedules from both **Codeforces** (via official REST APIs) and **LeetCode** (via official GraphQL endpoints) into a single, cohesive, glassmorphism dashboard.

### Core Objectives
1. **Unified Identity:** Eliminate the friction of switching between multiple platforms by giving coders a single, centralized profile for their competitive programming and technical interview prep.
2. **Zero-Tracking / Privacy-First Architecture:** The client does not load external CDN scripts that can be blocked by browser tracking protections (such as Brave Shields, Firefox Enhanced Tracking Protection, or ad blockers). All assets—including Chart.js, Lucide icons, and Tailwind styles—are bundled locally.
3. **Resilience & Caching:** Upstream rate-limiting and slow external endpoints are mitigated using an in-memory TTL cache (3 minutes) and resilient avatar proxies that generate SVG initials if remote images fail.
4. **Clean & Modern Aesthetic:** Built with a modern glassmorphic dark/light UI, responsive across mobile, tablet, and widescreen desktop displays.

---

## 2. Directory Tree & Architecture

The project has been reorganized into standard modular folders (`/backend`, `/public`, `/src`) following software engineering best practices.

```text
Tracker for codeforces and Leetcode/
├── .gitignore                      # Git ignore file (node_modules, logs, env, OS artifacts)
├── README.md                       # Quickstart documentation and repository readme
├── PROJECT_REPORT.md               # Detailed technical project report and architecture reference
├── package.json                    # Project dependencies, metadata, and build scripts
├── package-lock.json               # Deterministic dependency lockfile
├── server.js                       # Root bootstrap entry point (delegates to backend/server.js)
├── start.bat                       # One-click Windows launcher script
├── tailwind.config.js              # Tailwind CSS configuration and custom color tokens
│
├── backend/                        # Modular Node.js / Express backend
│   ├── config/
│   │   └── constants.js            # Global constants (PORT, CACHE_TTL, BROWSER_HEADERS)
│   ├── routes/
│   │   ├── cfRoutes.js             # Codeforces API route definitions (/api/cf/*)
│   │   ├── lcRoutes.js             # LeetCode API route definitions (/api/lc/*)
│   │   └── contestRoutes.js        # Upcoming contest routes (/api/contests)
│   ├── services/
│   │   ├── codeforcesService.js    # CF user info, rating history, submissions, tag analysis
│   │   ├── leetcodeService.js      # LC GraphQL query, multi-year streak aggregation, stats
│   │   └── contestService.js       # Contest scheduling aggregator for CF & LC
│   ├── utils/
│   │   ├── avatar.js               # Avatar URL normalizer, default detector, SVG initial generator
│   │   ├── cache.js                # In-memory Map cache with TTL eviction logic
│   │   └── streaks.js              # Timezone-tolerant calendar day streak engine
│   └── server.js                   # Express application setup, middleware, and route mounting
│
├── public/                         # Client-side web application assets (served statically)
│   ├── app.js                      # Frontend application logic, state, charts, tabs, and API client
│   ├── index.html                  # Semantic HTML5 dashboard layout with accessible markup
│   ├── styles.css                  # Custom styles, animations, scrollbars, and glassmorphism classes
│   ├── tailwind.css                # Compiled, minified Tailwind CSS bundle (offline-ready)
│   ├── favicon.svg                 # Application favicon icon
│   └── vendor/                     # Self-contained third-party libraries (no CDN dependency)
│       ├── chart.umd.js            # Chart.js UMD build
│       ├── chart.umd.min.js        # Chart.js minified bundle
│       ├── lucide.js               # Lucide icons library
│       └── lucide.min.js           # Lucide icons minified bundle
│
└── src/
    └── input.css                   # Tailwind source CSS directives (@tailwind base, components, utilities)
```

### Breakdown of Key Folders and Files

| Path | Purpose |
| :--- | :--- |
| `server.js` | Top-level entry file ensuring `npm start` and `node server.js` work out-of-the-box. |
| `backend/server.js` | Express app configuration, static file middleware, vendor bindings, and API routing. |
| `backend/services/` | Business logic for querying external APIs, formatting payloads, and computing statistics. |
| `backend/utils/streaks.js` | Timezone-aware streak calculation engine supporting multi-year histories. |
| `backend/utils/cache.js` | In-memory cache layer to reduce external API pressure and prevent rate-limiting. |
| `backend/utils/avatar.js` | Normalizes protocol-relative avatar URLs and provides SVG fallback avatars. |
| `public/index.html` | Dashboard HTML structure featuring tabs for Overview, Codeforces, LeetCode, Upcoming Contests, and Head-to-Head Compare. |
| `public/app.js` | Client-side reactive controller: handles search, URL parameters (`?u=`), charts, countdown timers, and theme toggling. |
| `public/vendor/` | Local vendor libraries loaded without external network calls to avoid ad-blocker or tracking-protection failures. |

---

## 3. Implemented Features Summary

### A. Unified Overview Dashboard
- **Cross-Platform Aggregations:** Computes total combined problems solved across both platforms with visually distinct platform pills.
- **Hero Profile Cards:** Renders official rank colors, profile pictures, country/organization metadata, and official platform badges (e.g., Guardian, Knight, Grandmaster).
- **Next Contest Ticker:** Synchronized live countdown timer showing the next upcoming contest across either platform down to the second.
- **URL Parameter Direct Navigation:** Supports `?u=username` query parameter to automatically query and populate data upon page load.
- **Quick Preset Coders:** One-click presets (`tourist`, `neal_wu`, `Benq`, `Petr`) for instant demonstration.

### B. Codeforces Deep-Dive Analytics
- **Live User Stats:** Current rating, peak rating, current rank, and maximum rank with official CF ranking palette.
- **Interactive Rating Timeline:** Chart.js line graph displaying rating changes over time with contest name and change delta on hover.
- **Problem Rating Histogram:** Bar chart categorizing solved problems by difficulty rating (800 to 3000+).
- **Tags & Topic Distribution:** Radar / horizontal bar chart summarizing strengths across topics (Dynamic Programming, Greedy, Math, Graphs, Trees, etc.).
- **Submissions Table:** Chronological feed of the last 20 submissions detailing problem name, index, rating, verdict badge (Accepted, WA, TLE, etc.), programming language, memory, and runtime.

### C. LeetCode Deep-Dive Analytics
- **Solved Problems Breakdown:** Solved count segmented by Easy, Medium, and Hard, paired with an interactive Donut Chart and category progress bars.
- **Submission & Acceptance Metrics:** Overall acceptance percentage and total submissions processed.
- **Contest Performance:** Live contest rating, global ranking, participant count, and top percentile badge.
- **Contest Rating History Chart:** Smooth line graph tracking rating trends across attended weekly and biweekly contests.
- **Recent Submissions Feed:** Live list of recently accepted problems with direct problem set links.

### D. Timezone-Tolerant Streak Engine
- **Accurate Liveness Checking:** Detects whether a streak is currently active by evaluating submissions on today (UTC and local), yesterday (awaiting today's solve), or tomorrow (UTC+ ahead timezones).
- **Zero-Out on Break:** Inactive users whose last solve was 2 or more days ago strictly show `0 days` (`0d`) instead of stale yearly maximums.
- **Multi-Year History Aggregation:** For LeetCode, queries all active years (`activeYears`) to calculate true lifetime maximum streaks.
- **Real-Time AC Inclusion:** Merges real-time solves from `recentAcSubmissionList` into cached submission calendars to register same-day solves immediately.

### E. Upcoming Contests Calendar
- **Cross-Platform Schedule:** Aggregates upcoming contests from Codeforces (Div. 1, Div. 2, Div. 3, Educational) and LeetCode (Weekly, Biweekly).
- **Live Countdowns:** Individual countdown timers per contest that refresh in real-time.
- **One-Click Calendar Sync:** "Add to Google Calendar" button generating pre-formatted calendar event links with direct contest URLs and start/end timestamps.
- **Platform Filtering:** Quick filter pills to view All, Codeforces-only, or LeetCode-only contests.

### F. Head-to-Head Comparison (Battle Arena)
- **Side-by-Side Duel:** Compare two coders across Codeforces rating, LeetCode rating, total problems solved, and current active streaks.
- **Automated Winner Highlighting:** Dynamically identifies category leaders and displays victory indicators.

### G. Responsive Layout & Theme Toggling
- **Dark & Light Mode:** Seamless theme toggling with CSS variables and Tailwind classes.
- **Local Persistence:** Theme preference and last queried handles are stored in `localStorage`.
- **Fully Responsive:** Tested and optimized for mobile screens, tablets, laptops, and ultra-wide desktop monitors.

---

## 4. Setup and Local Execution Guide

### Prerequisites
- **Node.js**: Version 18.x or higher (tested on Node.js v24 LTS).
- **npm**: Version 9.x or higher.

### Step 1: Clone or Open the Repository
```bash
git clone https://github.com/<your-username>/codeforces-leetcode-tracker.git
cd codeforces-leetcode-tracker
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run the Application
You can run the application using either of the following methods:

#### Method A: Command Line
```bash
npm start
```
The server will start on port `3000`. Open your browser and navigate to:
```text
http://localhost:3000
```

#### Method B: One-Click Windows Batch Launcher
Double-click [`start.bat`](file:///c:/Users/lenovo/OneDrive/Documents/Projects/Tracker%20for%20codeforces%20and%20Leetcode/start.bat) in the project root. It will verify Node.js, launch the Express server, and automatically open your default browser to `http://localhost:3000`.

### Development & Rebuilding Styles
If you modify Tailwind styles in `src/input.css` or markup classes:
```bash
npm run build:css
```
To run the server in development mode with auto-reload:
```bash
npm run dev
```

---

## 5. API Reference

All backend endpoints return standardized JSON structures with caching headers.

### 1. Codeforces User Profile & Stats
- **Endpoint:** `GET /api/cf/user/:handle`
- **Query Parameters:** `refresh=true` (optional, bypasses 3-minute in-memory cache)
- **Response:**
  ```json
  {
    "success": true,
    "fromCache": false,
    "data": {
      "profile": {
        "handle": "tourist",
        "rank": "legendary grandmaster",
        "rating": 3343,
        "maxRating": 3979,
        "avatar": "https://...",
        "proxyAvatar": "/api/cf/avatar/tourist"
      },
      "stats": {
        "totalSolved": 2185,
        "currentStreak": 0,
        "maxStreak": 14,
        "totalActiveDays": 380,
        "ratingDistribution": { "800": 15, "1200": 30 },
        "recentSubmissions": [...]
      },
      "ratingHistory": [...]
    }
  }
  ```

### 2. LeetCode User Profile & Stats
- **Endpoint:** `GET /api/lc/user/:username`
- **Query Parameters:** `refresh=true` (optional)
- **Response:**
  ```json
  {
    "success": true,
    "fromCache": false,
    "data": {
      "profile": {
        "username": "lee215",
        "ranking": 425,
        "avatar": "https://..."
      },
      "stats": {
        "totalSolved": 890,
        "easySolved": 240,
        "mediumSolved": 490,
        "hardSolved": 160,
        "acceptanceRate": "68.4",
        "currentStreak": 0,
        "maxStreak": 23,
        "totalActiveDays": 529,
        "recentSubmissions": [...]
      },
      "contest": {
        "rating": 2840,
        "topPercentage": 0.08,
        "history": [...]
      }
    }
  }
  ```

### 3. Upcoming Contests Schedule
- **Endpoint:** `GET /api/contests`
- **Query Parameters:** `refresh=true` (optional)
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "platform": "Codeforces",
        "id": "cf-2024",
        "title": "Codeforces Round 998 (Div. 2)",
        "startTime": 1729000000,
        "duration": 7200,
        "remainingSeconds": 34500,
        "url": "https://codeforces.com/contests/2024"
      },
      {
        "platform": "LeetCode",
        "id": "lc-weekly-contest-420",
        "title": "Weekly Contest 420",
        "startTime": 1729120000,
        "duration": 5400,
        "remainingSeconds": 154500,
        "url": "https://leetcode.com/contest/weekly-contest-420"
      }
    ]
  }
  ```

### 4. Avatar Proxies
- **Codeforces Avatar:** `GET /api/cf/avatar/:handle`
- **LeetCode Avatar:** `GET /api/lc/avatar/:username`
- Streams cached image buffer or dynamically serves a generated SVG fallback with user initial.

---

## 6. Verification and Test Results

The restructured codebase was comprehensively verified against live platforms:
1. **Server Boot:** Server launched successfully via `node server.js` on port `3000`.
2. **Endpoint Validation:**
   - `GET /api/cf/user/tourist`: Returned status 200, rating 3343, active submissions.
   - `GET /api/lc/user/lee215`: Returned status 200, `currentStreak: 0` (correctly zeroed out inactive streak).
   - `GET /api/lc/user/LarryNY`: Returned status 200, `currentStreak: 1076` (accurately maintaining active streak).
   - `GET /api/contests`: Returned active contests from both Codeforces and LeetCode sorted chronologically.
   - `GET /`: Returned `200 OK` with complete HTML5 dashboard and offline vendor assets.
3. **CSS Compilation:** Built without errors using Tailwind CSS CLI.
4. **Git Preparedness:** Added `.gitignore` to prevent committing `node_modules` or local logs.

---
*Report generated and project prepared for GitHub repository upload.*
