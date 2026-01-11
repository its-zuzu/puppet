# 🚀 Quick Start Guide - CTFd-Style Graph

## 3-Step Setup

### Step 1: Run Setup Script
```bash
cd /home/prasanth/Desktop/CTF_EVENT/CTF_PLATFORM/ctf-test
./SETUP_CTFD_GRAPH.sh
```

This will:
- Install Recharts dependency
- Initialize competition with start time
- Restart backend

---

### Step 2: Use the Component

In any page (e.g., `Scoreboard.jsx`):

```jsx
import CTFdScoreboardGraph from '../components/CTFdScoreboardGraph';

function ScoreboardPage() {
  return (
    <div className="page-container">
      <h1>Live Scoreboard</h1>
      
      {/* Add the graph */}
      <CTFdScoreboardGraph />
      
      {/* Your existing scoreboard table */}
      <YourScoreboardTable />
    </div>
  );
}
```

---

### Step 3: View the Graph

Navigate to the page where you added the component. You'll see:

```
┌─────────────────────────────────────────────────────┐
│            Score Progression                        │
│   Competition: CTF 2026 • Started: 11 Jan 10:00   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  5000│                              ●────          │
│      │                            ╱                │
│  4000│                    ●──────┘                 │
│      │                  ╱                          │
│  3000│          ●──────┘                           │
│      │        ╱                                    │
│  2000│  ●────┘                                     │
│      │╱                                            │
│  1000●                                             │
│      │                                             │
│     0●─────────────────────────────────────────────│
│      0   30m   1h   1h30   2h   2h30   3h        │
│                  Elapsed Time                      │
└─────────────────────────────────────────────────────┘

Top Teams:
#1  ● r4kapig          5400 pts   12 solves   Last: 3h
#2  ● :D               4200 pts   10 solves   Last: 2h45m
#3  ● ThatWeeb...      3800 pts    9 solves   Last: 2h30m
```

---

## API Usage (Optional)

### Get Graph Data Programmatically

```javascript
const response = await axios.get('/api/scoreboard/graph?limit=10', {
  headers: { Authorization: `Bearer ${token}` }
});

const { teams, chartData, competition } = response.data.data;

console.log('Competition Start:', competition.startTime);
console.log('Top Team:', teams[0].teamName, teams[0].finalScore);
```

### Response Format

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
        "teamId": "abc123",
        "teamName": "r4kapig",
        "rank": 1,
        "finalScore": 5400,
        "lastSolveTime": 10800000,
        "solveCount": 12,
        "data": [
          { "elapsedTime": 0, "score": 0 },
          { "elapsedTime": 300000, "score": 500 },
          ...
        ]
      }
    ],
    "chartData": [
      { "elapsedTime": 0, "r4kapig": 0, ":D": 0 },
      { "elapsedTime": 300000, "r4kapig": 500, ":D": 0 },
      ...
    ]
  }
}
```

---

## Configuration Options

### Change Number of Teams

```jsx
// In CTFdScoreboardGraph.jsx
const response = await axios.get('/api/scoreboard/graph?limit=15', config);
//                                                            ^^^ Change this
```

### Adjust Refresh Rate

```jsx
// In CTFdScoreboardGraph.jsx
const interval = setInterval(fetchGraphData, 60000); // 1 minute instead of 30s
//                                           ^^^^^ Change this
```

### Modify Colors

```jsx
// In CTFdScoreboardGraph.jsx
const TEAM_COLORS = [
  '#FF0000', // Your custom red
  '#00FF00', // Your custom green
  // ... add more colors
];
```

---

## How It Works

### 1. Time Normalization (Zero Start)

```javascript
Competition Start: 10:00:00 AM
Solve Timestamp:   10:05:23 AM
────────────────────────────────
Elapsed Time:      5 minutes 23 seconds → 323,000ms
```

Every solve is converted to "elapsed time since competition start".

### 2. Explicit (0,0) Start

```javascript
// Each team's data MUST start at origin
const dataPoints = [
  { elapsedTime: 0, score: 0 }  // ← CRITICAL for zero-start
];

// Then add actual solves
solves.forEach(solve => {
  dataPoints.push({
    elapsedTime: solve.elapsedTime,
    score: solve.score
  });
});
```

### 3. Step-Line (Not Smooth)

```javascript
<Line 
  type="stepAfter"  // ← Makes score stay flat until solve
  dataKey={team.teamName}
/>
```

Result:
```
Score stays flat: ─────
                        │
Jump at solve:          └─────
```

### 4. Tie-Breaking Logic

```javascript
// Primary sort: Score (higher is better)
if (b.finalScore !== a.finalScore) {
  return b.finalScore - a.finalScore;
}

// Tie-breaker: Last solve time (earlier is better)
return a.lastSolveTime - b.lastSolveTime;
```

**Example:**
- Team A: 3000 pts, last solve at 1h 30m → **Rank 1**
- Team B: 3000 pts, last solve at 2h 00m → Rank 2

---

## Troubleshooting

### "No active competition found"
**Solution:**
```bash
cd backend
node scripts/initCompetition.js
```

### Graph doesn't show
**Check:**
1. Backend route registered in `server.js`
2. Recharts installed: `npm install recharts`
3. Competition exists in database
4. Submissions exist with `isCorrect: true`

### Lines don't start at (0,0)
**Fix:** Ensure explicit zero point in data transformation:
```javascript
const dataPoints = [{ elapsedTime: 0, score: 0 }]; // Must be first!
```

### Time format is wrong
**Check formatElapsedTime function:**
```javascript
formatElapsedTime(0) → "00:00"
formatElapsedTime(300000) → "5m"
formatElapsedTime(5400000) → "1h 30m"
```

---

## Testing Checklist

- [ ] Competition initialized (`node scripts/initCompetition.js`)
- [ ] Backend route registered in `server.js`
- [ ] Recharts installed in frontend
- [ ] Component imported and used
- [ ] Backend running
- [ ] Frontend running
- [ ] At least one correct submission exists
- [ ] Graph displays correctly
- [ ] Lines start at (0,0)
- [ ] X-axis shows elapsed time (00:00, 5m, etc.)
- [ ] Y-axis shows scores
- [ ] Tooltip works on hover
- [ ] Rankings summary matches graph
- [ ] Auto-refresh works (wait 30s)

---

## Example Page Implementation

**Complete example:**

```jsx
import { useState } from 'react';
import CTFdScoreboardGraph from '../components/CTFdScoreboardGraph';
import './ScoreboardPage.css';

function ScoreboardPage() {
  const [view, setView] = useState('graph'); // 'graph' or 'table'

  return (
    <div className="scoreboard-page">
      <div className="page-header">
        <h1>Live Scoreboard</h1>
        
        <div className="view-toggle">
          <button 
            className={view === 'graph' ? 'active' : ''}
            onClick={() => setView('graph')}
          >
            📈 Graph View
          </button>
          <button 
            className={view === 'table' ? 'active' : ''}
            onClick={() => setView('table')}
          >
            📋 Table View
          </button>
        </div>
      </div>

      {view === 'graph' ? (
        <CTFdScoreboardGraph />
      ) : (
        <YourExistingScoreboardTable />
      )}
    </div>
  );
}

export default ScoreboardPage;
```

---

## 🎉 You're Done!

Your platform now has a **professional CTFd-style scoreboard graph** that:

✅ Starts at (0,0) for all teams  
✅ Shows elapsed time from competition start  
✅ Uses step-lines (flat until solve)  
✅ Implements proper tie-breaking  
✅ Auto-refreshes every 30 seconds  
✅ Matches your platform theme  
✅ Works on mobile and desktop  

**Perfect for live CTF competitions! 🏆**
