import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import AuthContext from '../context/AuthContext';
import Loading from './Loading';
import './CTFdScoreboardGraph.css';

// High-contrast colors for team lines
const TEAM_COLORS = [
  '#00FF88', // Bright Green (matches platform theme)
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

/**
 * Cumulative sum utility
 */
const cumulativeSum = (arr) => {
  const result = [];
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    result.push(sum);
  }
  return result;
};

/**
 * Format elapsed milliseconds to human-readable duration
 * @param {number} ms - Milliseconds elapsed
 * @returns {string} - Formatted string like "1h 30m" or "45m" or "2h"
 */
const formatElapsedTime = (ms) => {
  if (ms === 0) return '00:00';

  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
};

/**
 * Format timestamp to time display
 */
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

/**
 * Custom tooltip for showing team scores at specific times
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="ctfd-graph-tooltip">
      <div className="tooltip-time">{formatElapsedTime(label)}</div>
      <div className="tooltip-scores">
        {payload
          .filter(entry => entry.value > 0)
          .sort((a, b) => b.value - a.value)
          .map((entry, index) => (
            <div key={index} className="tooltip-entry">
              <span
                className="tooltip-color"
                style={{ backgroundColor: entry.color }}
              />
              <span className="tooltip-team">{entry.name}:</span>
              <span className="tooltip-value">{entry.value} pts</span>
            </div>
          ))}
      </div>
    </div>
  );
};

/**
 * CTFd-Style Scoreboard Graph Component
 * Shows team score progression from competition start (00:00)
 */
function CTFdScoreboardGraph() {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGraphData = async () => {
    try {
      // CTFd-style endpoint: /api/scoreboard/top/{count}
      const response = await axios.get('/api/scoreboard/top/10');

      if (response.data.success) {
        // CTFd format: { "1": {id, name, score, solves: []}, "2": {...} }
        const ctfdData = response.data.data;

        // Transform CTFd data to chart format
        const transformedData = transformCTFdData(ctfdData);
        setGraphData(transformedData);
        setError(null);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching graph data:', err);
      setError(err.response?.data?.message || 'Failed to load graph');
      setLoading(false);
    }
  };

  /**
   * Transform CTFd-style data to Recharts format
   */
  const transformCTFdData = (ctfdData) => {
    const teams = Object.keys(ctfdData);
    if (teams.length === 0) return null;

    // Build chart data - all timestamps with team scores
    const allTimestamps = new Set();
    const teamScores = {};

    teams.forEach(rank => {
      const team = ctfdData[rank];
      teamScores[team.name] = [];

      // Get solve values and timestamps
      const solveValues = team.solves.map(s => s.value);
      const solveTimes = team.solves.map(s => new Date(s.date).getTime());

      // Calculate cumulative scores
      const cumulativeScores = cumulativeSum(solveValues);

      // Store data points
      solveTimes.forEach((time, idx) => {
        allTimestamps.add(time);
        teamScores[team.name].push({
          timestamp: time,
          score: cumulativeScores[idx]
        });
      });
    });

    // Convert to sorted array of timestamps
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // Build chart data array
    const chartData = sortedTimestamps.map(timestamp => {
      const dataPoint = { timestamp };

      teams.forEach(rank => {
        const team = ctfdData[rank];
        const teamData = teamScores[team.name];

        // Find the score at this timestamp
        const pointAtTime = teamData.find(p => p.timestamp === timestamp);
        if (pointAtTime) {
          dataPoint[team.name] = pointAtTime.score;
        } else {
          // Find last known score before this timestamp
          const previousPoints = teamData.filter(p => p.timestamp < timestamp);
          if (previousPoints.length > 0) {
            dataPoint[team.name] = previousPoints[previousPoints.length - 1].score;
          } else {
            dataPoint[team.name] = 0;
          }
        }
      });

      return dataPoint;
    });

    // Build teams array with metadata
    const teamsArray = teams.map((rank, index) => {
      const team = ctfdData[rank];
      const teamData = teamScores[team.name];
      const lastSolve = teamData.length > 0 ? teamData[teamData.length - 1] : null;

      return {
        teamId: team.id,
        teamName: team.name,
        rank: parseInt(rank),
        finalScore: team.score,
        solveCount: team.solves.length,
        lastSolveTime: lastSolve ? lastSolve.timestamp : 0
      };
    });

    return { teams: teamsArray, chartData };
  };

  useEffect(() => {
    fetchGraphData();
    const interval = setInterval(fetchGraphData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="ctfd-graph-container">
        <Loading size="small" inline text="Loading graph" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="ctfd-graph-container">
        <div className="ctfd-graph-error">{error}</div>
      </div>
    );
  }

  if (!graphData || graphData.teams.length === 0) {
    return (
      <div className="ctfd-graph-container">
        <div className="ctfd-graph-empty">No team data available</div>
      </div>
    );
  }

  const { teams, chartData } = graphData;

  return (
    <div className="ctfd-graph-container">
      <div className="ctfd-graph-header">
        <h2 className="ctfd-graph-title">Score Progression</h2>
        <div className="ctfd-graph-subtitle">
          Top {teams.length} Teams
        </div>
      </div>

      <div className="ctfd-graph-chart">
        <ResponsiveContainer width="100%" height={500}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />

            {/* X-Axis: Time */}
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatTimestamp}
              stroke="rgba(255,255,255,0.7)"
              label={{
                value: 'Time',
                position: 'insideBottom',
                offset: -10,
                style: { fill: 'rgba(255,255,255,0.7)' }
              }}
              angle={-45}
              textAnchor="end"
              height={80}
            />

            {/* Y-Axis: Score with dynamic scaling + padding */}
            <YAxis
              domain={[0, (dataMax) => (Math.ceil(dataMax * 1.15))]}
              stroke="rgba(255,255,255,0.7)"
              label={{
                value: 'Score',
                angle: -90,
                position: 'insideLeft',
                style: { fill: 'rgba(255,255,255,0.7)' }
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
              formatter={(value, entry) => {
                const team = teams.find(t => t.teamName === value);
                return team ?
                  `${team.rank}. ${value} (${team.finalScore} pts)` :
                  value;
              }}
            />

            {/* Render a Line for each team */}
            {teams.map((team, index) => (
              <Line
                key={team.teamId}
                type="linear"
                dataKey={team.teamName}
                stroke={TEAM_COLORS[index % TEAM_COLORS.length]}
                strokeWidth={2.5}
                dot={true}
                activeDot={{ r: 6 }}
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={1000}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Team Rankings Summary */}
      <div className="ctfd-graph-rankings">
        <h3>Top Teams</h3>
        <div className="ctfd-rankings-list">
          {teams.map((team, index) => (
            <div key={team.teamId} className="ctfd-ranking-item">
              <div className="ranking-position">#{team.rank}</div>
              <div
                className="ranking-color"
                style={{ backgroundColor: TEAM_COLORS[index % TEAM_COLORS.length] }}
              />
              <div className="ranking-team">{team.teamName}</div>
              <div className="ranking-score">{team.finalScore} pts</div>
              <div className="ranking-solves">{team.solveCount} solves</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CTFdScoreboardGraph;
