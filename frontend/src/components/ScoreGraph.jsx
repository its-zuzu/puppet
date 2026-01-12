import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import './ScoreGraph.css';

/**
 * CTFd-Exact Score Progression Graph
 * 
 * Displays cumulative score over time using the dedicated graph API endpoint.
 * Matches CTFd's implementation exactly:
 * - Server-side cumulative score calculation
 * - Time-series data from /api/v1/scoreboard/graph
 * - Clean line chart visualization
 */
function ScoreGraph({ type = 'teams', limit = 10 }) {
  const { token } = useContext(AuthContext);
  const [graphData, setGraphData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGraphData();
    const interval = setInterval(fetchGraphData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [type, limit]);

  const fetchGraphData = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      // Use the dedicated graph endpoint (CTFd-style)
      const response = await axios.get(
        `/api/v1/scoreboard/graph?type=${type}&count=${limit}`, 
        config
      );
      
      if (response.data.success) {
        const data = response.data.data;
        processGraphData(data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Score graph fetch error:', err);
      setError('Failed to load score progression');
      setLoading(false);
    }
  };

  const processGraphData = (data) => {
    // Data is already in the correct format from the graph API
    // Format: { "1": { id, name, timeline: [{time, score}] }, ... }
    const accounts = Object.values(data);
    if (accounts.length === 0) {
      setGraphData([]);
      return;
    }

    // Transform to component format
    const timelineData = accounts.map((account, index) => {
      // Timeline is already sorted and cumulative from backend
      const points = (account.timeline || []).map(point => ({
        time: new Date(point.time),
        score: point.score
      }));

      // If no points, create a baseline
      if (points.length === 0) {
        const now = new Date();
        return {
          id: account.id,
          name: account.name,
          color: getColorForIndex(index),
          points: [
            { time: new Date(now.getTime() - 3600000), score: 0 },
            { time: now, score: 0 }
          ]
        };
      }

      return {
        id: account.id,
        name: account.name,
        color: getColorForIndex(index),
        points: points
      };
    });

    setGraphData(timelineData);
  };

  const getColorForIndex = (index) => {
    // Dark theme optimized color palette
    const colors = [
      '#00d9ff', // Bright Cyan
      '#ff6b9d', // Pink
      '#00ff88', // Green
      '#ffd93d', // Yellow
      '#bd93f9', // Purple
      '#ff6b6b', // Red
      '#4ecdc4', // Teal
      '#95e1d3', // Mint
      '#ff9f43', // Orange
      '#6c5ce7'  // Indigo
    ];
    return colors[index % colors.length];
  };

  const formatTime = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDuration = (milliseconds) => {
    if (!milliseconds || isNaN(milliseconds) || milliseconds < 0) {
      return '0m';
    }
    
    const totalMinutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return <div className="score-graph-loading">Loading graph...</div>;
  }

  if (error) {
    return null; // Don't show graph on error
  }

  if (graphData.length === 0) {
    return (
      <div className="score-graph-container">
        <h2 className="graph-title">Score Progression</h2>
        <div className="no-graph-data">No solve data available yet</div>
      </div>
    );
  }

  // Calculate graph dimensions and scales
  const allScores = graphData.flatMap(d => d.points.map(p => p.score)).filter(s => !isNaN(s));
  const allTimes = graphData.flatMap(d => d.points.map(p => p.time.getTime())).filter(t => !isNaN(t));
  
  const maxScore = allScores.length > 0 ? Math.max(...allScores, 100) : 100;
  const minTime = allTimes.length > 0 ? Math.min(...allTimes) : Date.now() - 3600000;
  const maxTime = allTimes.length > 0 ? Math.max(...allTimes) : Date.now();
  const timeRange = maxTime - minTime || 3600000;

  // Nice rounded max score for Y-axis
  const niceMaxScore = Math.ceil(maxScore / 100) * 100 || 100;

  // SVG dimensions
  const width = 1000;
  const height = 400;
  const padding = { top: 40, right: 100, bottom: 60, left: 70 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Scale functions
  const xScale = (time) => {
    const normalized = (time - minTime) / timeRange;
    return padding.left + normalized * graphWidth;
  };
  
  const yScale = (score) => {
    const normalized = score / niceMaxScore;
    return padding.top + (1 - normalized) * graphHeight;
  };

  // Generate SVG path for each account
  const generatePath = (points) => {
    if (points.length === 0) return '';
    
    const startX = xScale(points[0].time.getTime());
    const startY = yScale(points[0].score);
    let path = `M ${startX} ${startY}`;
    
    for (let i = 1; i < points.length; i++) {
      const x = xScale(points[i].time.getTime());
      const y = yScale(points[i].score);
      path += ` L ${x} ${y}`;
    }
    
    return path;
  };

  // Generate Y-axis labels (5 ticks)
  const yAxisLabels = [];
  for (let i = 0; i <= 5; i++) {
    const score = Math.round((niceMaxScore / 5) * i);
    yAxisLabels.push({
      y: yScale(score),
      label: score
    });
  }

  // Generate X-axis labels (time-based)
  const xAxisLabels = [];
  const numXLabels = 6;
  for (let i = 0; i < numXLabels; i++) {
    const ratio = i / (numXLabels - 1);
    const time = minTime + timeRange * ratio;
    xAxisLabels.push({
      x: xScale(time),
      label: formatDuration((time - minTime))
    });
  }

  return (
    <div className="score-graph-container">
      <h2 className="graph-title">Score Progression</h2>
      
      <svg className="score-graph" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Grid pattern */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2a3f5f" strokeWidth="0.5"/>
          </pattern>
        </defs>

        {/* Background grid */}
        <rect 
          x={padding.left} 
          y={padding.top} 
          width={graphWidth} 
          height={graphHeight} 
          fill="url(#grid)" 
        />

        {/* Horizontal grid lines */}
        <g className="grid-lines-horizontal">
          {yAxisLabels.map((label, i) => (
            <line
              key={`grid-h-${i}`}
              x1={padding.left}
              y1={label.y}
              x2={width - padding.right}
              y2={label.y}
              stroke="#3a5a7f"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.4"
            />
          ))}
        </g>

        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#5a7fa0"
          strokeWidth="2"
        />

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#5a7fa0"
          strokeWidth="2"
        />

        {/* Y-axis labels */}
        <g className="y-axis-labels">
          {yAxisLabels.map((label, i) => (
            <text
              key={`y-label-${i}`}
              x={padding.left - 15}
              y={label.y + 5}
              textAnchor="end"
              fill="#b0c4de"
              fontSize="14"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {label.label}
            </text>
          ))}
          <text
            x={padding.left - 50}
            y={padding.top + graphHeight / 2}
            textAnchor="middle"
            fill="#d0e0f0"
            fontSize="16"
            fontWeight="600"
            fontFamily="system-ui, -apple-system, sans-serif"
            transform={`rotate(-90, ${padding.left - 50}, ${padding.top + graphHeight / 2})`}
          >
            Score
          </text>
        </g>

        {/* X-axis labels */}
        <g className="x-axis-labels">
          {xAxisLabels.map((label, i) => (
            <text
              key={`x-label-${i}`}
              x={label.x}
              y={height - padding.bottom + 25}
              textAnchor="middle"
              fill="#b0c4de"
              fontSize="14"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {label.label}
            </text>
          ))}
          <text
            x={padding.left + graphWidth / 2}
            y={height - 15}
            textAnchor="middle"
            fill="#d0e0f0"
            fontSize="16"
            fontWeight="600"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            Time Elapsed
          </text>
        </g>

        {/* Score lines */}
        <g className="score-lines">
          {graphData.map((account, index) => (
            <g key={account.id}>
              <path
                d={generatePath(account.points)}
                stroke={account.color}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
              {/* Draw dots at each point */}
              {account.points.map((point, pointIndex) => (
                <circle
                  key={`${account.id}-${pointIndex}`}
                  cx={xScale(point.time.getTime())}
                  cy={yScale(point.score)}
                  r="4"
                  fill={account.color}
                  stroke="#0f1419"
                  strokeWidth="2"
                >
                  <title>{`${account.name}: ${point.score} pts at ${formatTime(point.time)}`}</title>
                </circle>
              ))}
            </g>
          ))}
        </g>

        {/* Legend inside graph */}
        <g className="legend">
          {graphData.slice(0, 10).map((account, i) => (
            <g key={account.id} transform={`translate(${width - padding.right + 10}, ${padding.top + 20 + i * 25})`}>
              <line
                x1={0}
                y1={0}
                x2={20}
                y2={0}
                stroke={account.color}
                strokeWidth="3"
              />
              <circle
                cx={10}
                cy={0}
                r={4}
                fill={account.color}
                stroke="#0f1419"
                strokeWidth="2"
              />
              <text
                x={25}
                y={5}
                fill="#d0e0f0"
                fontSize="12"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {account.name.length > 12 ? account.name.substring(0, 12) + '...' : account.name}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

export default ScoreGraph;
