import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import './ScoreGraph.css';

/**
 * CTFd-Style Score Progression Graph
 * 
 * Displays cumulative score over time for top teams/users
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

      const response = await axios.get(`/api/v1/scoreboard/top/${limit}?type=${type}`, config);
      
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
    // Convert CTFd format to graph data
    const accounts = Object.values(data);
    if (accounts.length === 0) {
      setGraphData([]);
      return;
    }

    // Build timeline data for each account
    const timelineData = accounts.map(account => {
      let cumulativeScore = 0;
      const points = account.solves.map(solve => {
        cumulativeScore += solve.value;
        return {
          time: new Date(solve.date),
          score: cumulativeScore
        };
      });

      // Add starting point
      if (points.length > 0) {
        points.unshift({ time: points[0].time, score: 0 });
      }

      return {
        id: account.id,
        name: account.name,
        color: getColorForIndex(accounts.indexOf(account)),
        points: points
      };
    });

    setGraphData(timelineData);
  };

  const getColorForIndex = (index) => {
    const colors = [
      '#00ffaa', // Cyan (primary)
      '#ff6b6b', // Red
      '#4ecdc4', // Teal
      '#ffe66d', // Yellow
      '#a8dadc', // Light blue
      '#f1faee', // Off-white
      '#e63946', // Crimson
      '#457b9d', // Dark blue
      '#f77f00', // Orange
      '#06ffa5'  // Green
    ];
    return colors[index % colors.length];
  };

  const formatTime = (date) => {
    const hours = Math.floor(date / 3600000);
    const minutes = Math.floor((date % 3600000) / 60000);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return <div className="score-graph-loading">Loading graph...</div>;
  }

  if (error || graphData.length === 0) {
    return null; // Don't show graph if no data
  }

  // Calculate graph dimensions
  const maxScore = Math.max(...graphData.flatMap(d => d.points.map(p => p.score))) || 100;
  const minTime = Math.min(...graphData.flatMap(d => d.points.map(p => p.time.getTime())));
  const maxTime = Math.max(...graphData.flatMap(d => d.points.map(p => p.time.getTime())));
  const timeRange = maxTime - minTime || 1;

  // SVG dimensions
  const width = 1000;
  const height = 400;
  const padding = { top: 40, right: 20, bottom: 60, left: 60 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Scale functions
  const xScale = (time) => padding.left + ((time - minTime) / timeRange) * graphWidth;
  const yScale = (score) => padding.top + (1 - score / maxScore) * graphHeight;

  // Generate path for each account
  const generatePath = (points) => {
    if (points.length === 0) return '';
    
    let path = `M ${xScale(points[0].time.getTime())} ${yScale(points[0].score)}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${xScale(points[i].time.getTime())} ${yScale(points[i].score)}`;
    }
    return path;
  };

  // X-axis labels (time)
  const xAxisLabels = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const time = minTime + timeRange * ratio;
    return {
      x: padding.left + graphWidth * ratio,
      label: formatTime(time - minTime)
    };
  });

  // Y-axis labels (score)
  const yAxisLabels = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const score = Math.floor(maxScore * ratio);
    return {
      y: padding.top + graphHeight * (1 - ratio),
      label: score
    };
  });

  return (
    <div className="score-graph-container">
      <h2 className="graph-title">
        Top {type === 'teams' ? 'Teams' : 'Users'} Score Progression
      </h2>
      
      <svg className="score-graph" viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        <g className="grid-lines">
          {yAxisLabels.map((label, i) => (
            <line
              key={`grid-h-${i}`}
              x1={padding.left}
              y1={label.y}
              x2={width - padding.right}
              y2={label.y}
              stroke="#2a3f5f"
              strokeWidth="1"
              strokeOpacity="0.3"
            />
          ))}
          {xAxisLabels.map((label, i) => (
            <line
              key={`grid-v-${i}`}
              x1={label.x}
              y1={padding.top}
              x2={label.x}
              y2={height - padding.bottom}
              stroke="#2a3f5f"
              strokeWidth="1"
              strokeOpacity="0.3"
            />
          ))}
        </g>

        {/* Y-axis labels */}
        <g className="y-axis-labels">
          {yAxisLabels.map((label, i) => (
            <text
              key={`y-label-${i}`}
              x={padding.left - 10}
              y={label.y + 5}
              textAnchor="end"
              fill="#94a3b8"
              fontSize="12"
            >
              {label.label}
            </text>
          ))}
          <text
            x={padding.left - 45}
            y={height / 2}
            textAnchor="middle"
            fill="#cbd5e1"
            fontSize="14"
            fontWeight="bold"
            transform={`rotate(-90, ${padding.left - 45}, ${height / 2})`}
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
              fill="#94a3b8"
              fontSize="12"
            >
              {label.label}
            </text>
          ))}
          <text
            x={width / 2}
            y={height - 10}
            textAnchor="middle"
            fill="#cbd5e1"
            fontSize="14"
            fontWeight="bold"
          >
            Elapsed Time
          </text>
        </g>

        {/* Score lines */}
        <g className="score-lines">
          {graphData.map((account, index) => (
            <path
              key={account.id}
              d={generatePath(account.points)}
              stroke={account.color}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      </svg>

      {/* Legend */}
      <div className="graph-legend">
        {graphData.slice(0, 5).map((account) => (
          <div key={account.id} className="legend-item">
            <span 
              className="legend-color" 
              style={{ backgroundColor: account.color }}
            />
            <span className="legend-name">{account.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ScoreGraph;
