# 🎯 CTFd-Style Scoreboard Graph Implementation

## Overview

A complete CTFd-style scoreboard graph that shows team score progression from competition start (00:00:00) with step-line visualization and proper tie-breaking.

---

## 🏗️ Architecture

### Backend Components

#### 1. Competition Model (`models/Competition.js`)
```javascript
{
  name: String,
  startTime: Date,        // Competition zero point
  endTime: Date,
  isActive: Boolean
}
```

#### 2. API Endpoint (`routes/scoreboard.js`)
**Endpoint**: `GET /api/scoreboard/graph?limit=10`

**Key Features:**
- Fetches all correct submissions
- Calculates elapsed time from competition start
- Builds cumulative scores per team
- Implements tie-breaking (score DESC, time ASC)
- Returns Recharts-compatible data structure
- Redis caching (30s TTL)

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "competition": {
      "name": "CTF Competition 2026",
      "startTime": "2026-01-11T10:00:00.000Z",
      "startTimeMs": 1736593200000
    },
    "teams": [
      {
        "teamId": "...",
        "teamName": "r4kapig",
        "rank": 1,
        "finalScore": 5400,
        "lastSolveTime": 21600000,
        "solveCount": 12,
        "data": [
          { "elapsedTime": 0, "score": 0 },
          { "elapsedTime": 300000, "score": 500 },
          ...
        ]
      }
    ],
    "chartData": [
      { "elapsedTime": 0, "r4kapig": 0, ":D": 0, ... },
      { "elapsedTime": 300000, "r4kapig": 500, ":D": 0, ... },
      ...
    ]
  }
}
```

### Frontend Component

#### CTFdScoreboardGraph.jsx

**Features:**
- Recharts LineChart with `type="stepAfter"`
- X-axis starts at 0 (00:00:00)
- Y-axis shows cumulative score
- Custom tooltip with team rankings
- Auto-refresh every 30 seconds
- Rankings summary below graph

**Time Formatting:**
```javascript
0ms → "00:00"
1,800,000ms → "30m"
5,400,000ms → "1h 30m"
```

---

## 🎨 Visual Design

### Graph Features
- **Step Line**: Scores stay flat until exact solve moment
- **Zero Start**: Every team starts at (0, 0)
- **Color Coded**: 10 distinct high-contrast colors
- **Dark Theme**: Matches platform (#0a0e17 background)
- **Responsive**: Works on mobile and desktop

### Color Palette
```javascript
const TEAM_COLORS = [
  '#00FF88', // Bright Green (platform theme)
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#FFD93D', // Yellow
  '#6BCB77', // Green
  '#4D96FF', // Blue
  '#FF6AC1', // Pink
  '#A8DADC', // Light Blue
  '#F77F00', // Orange
  '#9D4EDD'  // Purple
];
```

---

## 🚀 Setup Instructions

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install mongoose express redis
```

**Frontend:**
```bash
cd frontend
npm install recharts axios
```

### 2. Register Backend Route

In `backend/server.js`:
```javascript
const scoreboardRoutes = require('./routes/scoreboard');
app.use('/api/scoreboard', scoreboardRoutes);
```

### 3. Initialize Competition

```bash
cd backend
node scripts/initCompetition.js
```

This creates a Competition document with `startTime = NOW`.

### 4. Use the Component

```jsx
import CTFdScoreboardGraph from '../components/CTFdScoreboardGraph';

function ScoreboardPage() {
  return (
    <div>
      <h1>Scoreboard</h1>
      <CTFdScoreboardGraph />
    </div>
  );
}
```

---

## 📊 Data Flow

### 1. Time Normalization (The "Zero" Start)

```javascript
const competitionStartTime = new Date(competition.startTime).getTime();
const solveTime = new Date(submission.submittedAt).getTime();
const elapsedTime = solveTime - competitionStartTime; // Milliseconds from start
```

**Example:**
```
Competition Start: 2026-01-11 10:00:00
Solve Time:        2026-01-11 10:05:00
Elapsed Time:      300,000ms (5 minutes)
```

### 2. Explicit Zero Point

**Critical Implementation:**
```javascript
const dataPoints = [
  { elapsedTime: 0, score: 0 }  // EXPLICIT ZERO START
];

// Then add actual solve points
solves.forEach(solve => {
  dataPoints.push({
    elapsedTime: solve.elapsedTime,
    score: solve.score
  });
});
```

This ensures the graph line starts at the origin (0,0).

### 3. Step-Line Logic

Recharts `type="stepAfter"` keeps the line horizontal until the next data point:

```
Score
  500 |           ●───────
      |          /
  300 |    ●────┘
      |   /
  100 | ●┘
      |/
    0 ●──────────────────────> Time
      0  5m  10m  15m  20m
```

### 4. Tie-Breaking

```javascript
teamRankings.sort((a, b) => {
  // Primary: Score (higher is better)
  if (b.finalScore !== a.finalScore) {
    return b.finalScore - a.finalScore;
  }
  // Tie-breaker: Last solve time (earlier is better)
  return a.lastSolveTime - b.lastSolveTime;
});
```

**Example:**
```
Team A: 3000 pts, last solve at 1h 30m → Rank 1
Team B: 3000 pts, last solve at 2h 15m → Rank 2
```

---

## 🔧 Configuration

### Adjust Number of Teams
```javascript
// In API call
axios.get('/api/scoreboard/graph?limit=15', config);
```

### Modify Cache TTL
```javascript
// In backend/routes/scoreboard.js
const CACHE_TTL = 60; // 60 seconds
```

### Change Refresh Interval
```javascript
// In CTFdScoreboardGraph.jsx
const interval = setInterval(fetchGraphData, 60000); // 1 minute
```

---

## 📈 Example Scenarios

### Scenario 1: Competition Start
```
Time: 00:00
All teams at (0, 0)
Graph shows flat line at y=0
```

### Scenario 2: First Solve
```
Time: 00:05 (5 minutes)
Team A solves challenge (500 pts)

Graph:
Team A: (0,0) → (5m, 500)
Others: (0,0) → (5m, 0)
```

### Scenario 3: Multiple Solves
```
Time: 00:10
Team B solves same challenge (460 pts with dynamic scoring)

Graph:
Team A: (0,0) → (5m, 500) → (10m, 500)
Team B: (0,0) → (10m, 460)
```

---

## 🎯 Key Differences from Basic Graph

### Basic Graph (Before)
```javascript
// Teams might not start at (0,0)
// Time starts from actual timestamp
// No step-line effect
// Ranking by score only
```

### CTFd-Style Graph (After)
```javascript
// ✓ All teams explicitly start at (0,0)
// ✓ Time normalized to elapsed from competition start
// ✓ Step-line keeps scores flat until solve
// ✓ Tie-breaking by last solve time
// ✓ X-axis shows 00:00, 30m, 1h, etc.
```

---

## 🐛 Troubleshooting

### Graph doesn't start at 0
**Solution:** Ensure explicit zero point:
```javascript
const dataPoints = [{ elapsedTime: 0, score: 0 }];
```

### Teams not showing
**Solution:** Check Competition model exists:
```bash
node scripts/initCompetition.js
```

### Lines not stepping
**Solution:** Use `type="stepAfter"` in Line component:
```jsx
<Line type="stepAfter" dataKey={team.teamName} />
```

### Time format wrong
**Solution:** Check formatElapsedTime function:
```javascript
const formatElapsedTime = (ms) => {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};
```

---

## 🚀 Testing

### 1. Initialize Competition
```bash
cd backend
node scripts/initCompetition.js
```

### 2. Submit Test Solves
Use your existing submission system to create some solves.

### 3. View Graph
Navigate to the scoreboard page with the graph component.

### 4. Verify Features
- [ ] Graph starts at (0, 0)
- [ ] X-axis shows elapsed time (00:00, 5m, 10m, etc.)
- [ ] Lines are step functions (flat until solve)
- [ ] Tooltip shows team scores at hover
- [ ] Rankings summary matches graph
- [ ] Auto-refreshes every 30s
- [ ] Responsive on mobile

---

## 📊 Performance

### Optimization Strategies
1. **Redis Caching**: 30-second TTL reduces DB load
2. **Limited Teams**: Default shows top 10 (configurable)
3. **Efficient Queries**: Single DB query with lean()
4. **Client-Side Caching**: React state management

### Expected Load Times
- **First Load**: ~200-500ms (DB query)
- **Cached Load**: ~50-100ms (Redis)
- **Graph Render**: ~100-200ms (Recharts)

---

## 🎉 Result

You now have a **professional CTFd-style scoreboard graph** with:

✅ **Zero-start timeline** (00:00:00)  
✅ **Step-line visualization** (flat until solve)  
✅ **Proper tie-breaking** (score + time)  
✅ **Recharts integration** (responsive, interactive)  
✅ **Real-time updates** (30s auto-refresh)  
✅ **Platform theme** (dark mode, #00FF88 accent)  
✅ **Performance optimized** (Redis caching)  

**Perfect for competitive CTF events! 🏆**
