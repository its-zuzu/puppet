import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import './ScoreGraph.css';

/**
 * CTFd-Style Score Graph - Rebuilt from scratch
 */
function ScoreGraph({ type = 'teams', limit = 10 }) {
  const { token } = useContext(AuthContext);
  const [accounts, setAccounts] = useState([]);
  const [maxScore, setMaxScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGraph();
    const interval = setInterval(fetchGraph, 10000);
    return () => clearInterval(interval);
  }, [type, limit, token]);

  const fetchGraph = async () => {
    try {
      const { data } = await axios.get(
        `/api/v1/scoreboard/graph?type=${type}&count=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        const accountsList = Object.values(data.data).map((acc, i) => ({
          ...acc,
          color: getColor(i)
        }));
        setAccounts(accountsList);
        setMaxScore(data.maxScore || 1000);
      }
      setLoading(false);
    } catch (err) {
      console.error('Graph error:', err);
      setLoading(false);
    }
  };

  const getColor = (i) => {
    const colors = ['#00d9ff', '#ff6b9d', '#00ff88', '#ffd93d', '#bd93f9', 
                    '#ff6b6b', '#4ecdc4', '#95e1d3', '#ff9f43', '#6c5ce7'];
    return colors[i % colors.length];
  };

  if (loading) return <div className="score-graph-loading">Loading...</div>;
  if (accounts.length === 0) return <div className="no-graph-data">No data</div>;

  // Calculate bounds
  const allTimes = accounts.flatMap(a => a.data?.map(d => d.time) || []);
  const minTime = allTimes.length > 0 ? Math.min(...allTimes) : Date.now();
  const maxTime = allTimes.length > 0 ? Math.max(...allTimes) : Date.now() + 3600000;
  const timeRange = maxTime - minTime || 3600000;
  
  const yMax = Math.ceil(maxScore / 100) * 100 || 1000;

  // SVG dimensions
  const w = 1000, h = 400;
  const pad = { top: 40, right: 120, bottom: 60, left: 70 };
  const gw = w - pad.left - pad.right;
  const gh = h - pad.top - pad.bottom;

  // Scales
  const xScale = (time) => pad.left + ((time - minTime) / timeRange) * gw;
  const yScale = (score) => pad.top + (1 - score / yMax) * gh;

  // Generate path for account
  const makePath = (data) => {
    if (!data || data.length === 0) return '';
    
    let path = `M ${xScale(minTime)} ${yScale(0)}`; // Start at 0
    
    let currentScore = 0;
    for (const point of data) {
      // Horizontal line to this time at current score
      path += ` L ${xScale(point.time)} ${yScale(currentScore)}`;
      // Vertical jump to new score
      currentScore = point.score;
      path += ` L ${xScale(point.time)} ${yScale(currentScore)}`;
    }
    
    // Extend to end
    path += ` L ${xScale(maxTime)} ${yScale(currentScore)}`;
    
    return path;
  };

  // Y-axis ticks
  const yTicks = [];
  for (let i = 0; i <= 5; i++) {
    yTicks.push({ y: yScale(yMax * i / 5), label: Math.round(yMax * i / 5) });
  }

  // X-axis ticks
  const xTicks = [];
  for (let i = 0; i <= 5; i++) {
    const t = minTime + timeRange * i / 5;
    const elapsed = t - minTime;
    const mins = Math.floor(elapsed / 60000);
    xTicks.push({ x: xScale(t), label: `${mins}m` });
  }

  return (
    <div className="score-graph-container">
      <h2 className="graph-title">Score Progression</h2>
      
      <svg viewBox={`0 0 ${w} ${h}`} className="score-graph">
        {/* Grid */}
        {yTicks.map((tick, i) => (
          <line key={i} x1={pad.left} y1={tick.y} x2={w - pad.right} y2={tick.y}
                stroke="#3a5a7f" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        ))}

        {/* Axes */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={h - pad.bottom} 
              stroke="#5a7fa0" strokeWidth="2" />
        <line x1={pad.left} y1={h - pad.bottom} x2={w - pad.right} y2={h - pad.bottom}
              stroke="#5a7fa0" strokeWidth="2" />

        {/* Y labels */}
        {yTicks.map((tick, i) => (
          <text key={i} x={pad.left - 10} y={tick.y + 4} textAnchor="end" 
                fill="#b0c4de" fontSize="13">{tick.label}</text>
        ))}
        <text x={pad.left - 50} y={h / 2} textAnchor="middle" fill="#d0e0f0" 
              fontSize="15" fontWeight="600" transform={`rotate(-90, ${pad.left - 50}, ${h / 2})`}>
          Score
        </text>

        {/* X labels */}
        {xTicks.map((tick, i) => (
          <text key={i} x={tick.x} y={h - pad.bottom + 25} textAnchor="middle"
                fill="#b0c4de" fontSize="13">{tick.label}</text>
        ))}
        <text x={w / 2} y={h - 15} textAnchor="middle" fill="#d0e0f0" 
              fontSize="15" fontWeight="600">Time Elapsed</text>

        {/* Lines */}
        {accounts.map(acc => (
          <path key={acc.id} d={makePath(acc.data)} fill="none" 
                stroke={acc.color} strokeWidth="3" opacity="0.9" />
        ))}

        {/* Dots */}
        {accounts.map(acc => 
          acc.data?.map((point, i) => (
            <circle key={`${acc.id}-${i}`} cx={xScale(point.time)} cy={yScale(point.score)}
                    r="4" fill={acc.color} stroke="#0f1419" strokeWidth="2">
              <title>{acc.name}: {point.score} pts</title>
            </circle>
          ))
        )}

        {/* Legend */}
        {accounts.map((acc, i) => (
          <g key={acc.id} transform={`translate(${w - pad.right + 10}, ${pad.top + 10 + i * 22})`}>
            <line x1="0" y1="0" x2="20" y2="0" stroke={acc.color} strokeWidth="3" />
            <circle cx="10" cy="0" r="4" fill={acc.color} stroke="#0f1419" strokeWidth="2" />
            <text x="25" y="4" fill="#d0e0f0" fontSize="11">
              {acc.name.length > 15 ? acc.name.slice(0, 15) + '...' : acc.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default ScoreGraph;
