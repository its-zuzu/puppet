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
  const { token } = useContext(AuthContext);

  const fetchGraphData = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      const response = await axios.get('/api/scoreboard/graph?limit=10', config);
      
      if (response.data.success) {
        setGraphData(response.data.data);
        setError(null);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching graph data:', err);
      setError(err.response?.data?.message || 'Failed to load graph');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchGraphData, 30000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="ctfd-graph-container">
        <div className="ctfd-graph-loading">Loading graph...</div>
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

  if (!graphData || !graphData.chartData || graphData.chartData.length === 0) {
    return (
      <div className="ctfd-graph-container">
        <div className="ctfd-graph-empty">
          No solve data available yet. Start solving challenges!
        </div>
      </div>
    );
  }

  const { competition, teams, chartData } = graphData;

  return (
    <div className="ctfd-graph-container">
      <div className="ctfd-graph-header">
        <h2 className="ctfd-graph-title">Score Progression</h2>
        <div className="ctfd-graph-subtitle">
          Competition: {competition.name} • 
          Started: {new Date(competition.startTime).toLocaleString()}
        </div>
      </div>

      <div className="ctfd-graph-chart">
        <ResponsiveContainer width="100%" height={500}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            
            {/* X-Axis: Elapsed Time from 00:00 */}
            <XAxis
              dataKey="elapsedTime"
              type="number"
              domain={[0, 'dataMax']}
              tickFormatter={formatElapsedTime}
              stroke="rgba(255,255,255,0.7)"
              label={{
                value: 'Elapsed Time',
                position: 'insideBottom',
                offset: -10,
                style: { fill: 'rgba(255,255,255,0.7)' }
              }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            
            {/* Y-Axis: Score */}
            <YAxis
              domain={[0, (dataMax) => (Math.ceil(dataMax * 1.2 / 10) * 10)]}
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

            {/* Render a Step Line for each team */}
            {teams.map((team, index) => (
              <Line
                key={team.teamId}
                type="stepAfter"
                dataKey={team.teamName}
                stroke={TEAM_COLORS[index % TEAM_COLORS.length]}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6 }}
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={1000}
                animationBegin={0}
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
              <div className="ranking-time">
                Last: {formatElapsedTime(team.lastSolveTime)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CTFdScoreboardGraph;
