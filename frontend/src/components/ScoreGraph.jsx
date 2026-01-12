import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import AuthContext from '../context/AuthContext';

/**
 * CTFd-Style Score Graph using ECharts
 * Matches official CTFd visual style
 */
const ScoreGraph = ({ type = 'teams', limit = 10, height = '400px' }) => {
  const { token } = useContext(AuthContext);
  const [option, setOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    fetchGraphData();
    const interval = setInterval(fetchGraphData, 60000); // 1 minute refresh
    return () => clearInterval(interval);
  }, [type, limit, token]);

  const fetchGraphData = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const res = await axios.get(`/api/v1/scoreboard/graph?type=${type}`, config);
      const data = res.data.data; // { "1": { id, name, data: [{time, score}, ...] } }

      if (Object.keys(data).length === 0) {
        setHasData(false);
        setLoading(false);
        return;
      }
      setHasData(true);

      const series = [];
      const legendData = [];
      // Neon/Cyberpunk Palette matching dark theme
      const colors = [
        '#00F0FF', // Neon Cyan
        '#FF0055', // Neon Red/Pink
        '#00FF99', // Neon Green
        '#BD00FF', // Neon Purple
        '#FAFF00', // Neon Yellow
        '#FF8C00', // Neon Orange
        '#F0F',    // Magenta
        '#00CCFF', // Sky Blue
        '#FFE4E1', // Misty Rose
        '#7FFFD4'  // Aquamarine
      ];

      // Find global min time to start all graphs from same zero point
      let minTime = new Date().getTime();
      Object.values(data).forEach(team => {
        if (team.data.length > 0) {
          const t = new Date(team.data[0].time).getTime();
          if (t < minTime) minTime = t;
        }
      });
      // Offset slightly before first solve so 0 point is visible
      minTime = minTime - 3600000;

      Object.values(data).forEach((team, index) => {
        let timeSeries = team.data.map(d => [d.time, d.score]);

        // 1. Force start from (0,0) relative to first event
        // Add a 0 score point at minTime
        timeSeries.unshift([minTime, 0]);

        // Add current time point to extend line
        if (timeSeries.length > 0) {
          const lastPoint = timeSeries[timeSeries.length - 1];
          timeSeries.push([new Date().getTime(), lastPoint[1]]);
        }

        series.push({
          name: team.name,
          type: 'line',
          data: timeSeries,
          showSymbol: true,
          symbolSize: 8, // Slightly larger
          // symbol: 'circle',
          itemStyle: { color: colors[index % colors.length] },
          lineStyle: {
            width: 3,
            shadowColor: colors[index % colors.length], // Glow effect
            shadowBlur: 10
          },
          smooth: 0.3, // Slight curve for modern look
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{
                offset: 0, color: colors[index % colors.length] + '33' // 20% opacity
              }, {
                offset: 1, color: 'transparent'
              }]
            }
          }
        });
        legendData.push(team.name);
      });

      const chartOption = {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'line' }, // Clean line pointer
          backgroundColor: 'rgba(10, 10, 20, 0.95)',
          borderColor: '#333',
          textStyle: { color: '#fff' },
          formatter: (params) => {
            const date = new Date(params[0].axisValue);
            let result = `<div style="font-weight:bold; margin-bottom:5px;">${date.toLocaleTimeString()}</div>`;
            params.sort((a, b) => b.data[1] - a.data[1]);
            params.forEach(item => {
              const score = item.data[1];
              // Only show if score > 0 to restrict tooltip size on start
              result += `<div style="display:flex; justify-content:space-between; width:150px;">
                <span>${item.marker} ${item.seriesName}</span>
                <span style="font-weight:bold">${score}</span>
              </div>`;
            });
            return result;
          }
        },
        legend: {
          data: legendData,
          type: 'scroll',
          top: 0,
          textStyle: { color: '#e0e0e0', fontWeight: 'bold' },
          pageIconColor: '#00F0FF',
          pageTextStyle: { color: '#fff' }
        },
        grid: {
          left: '20px',
          right: '30px',
          bottom: '20px', // Increased space for labels
          top: '40px',
          containLabel: true
        },
        xAxis: {
          type: 'time',
          boundaryGap: false,
          axisLabel: {
            color: '#a0a0a0',
            formatter: '{HH}:{mm}', // Cleaner time format
            rotate: 0 // No rotation needed if interval is handled auto
          },
          splitLine: { show: false },
          axisLine: { lineStyle: { color: '#333' } }
        },
        yAxis: {
          type: 'value',
          min: 0, // Force start at 0
          axisLabel: { color: '#a0a0a0' },
          splitLine: {
            lineStyle: { color: '#1a1a2e', type: 'dashed' }
          }
        },
        series: series,
        backgroundColor: 'transparent',
      };

      setOption(chartOption);
      setLoading(false);
    } catch (err) {
      console.error('Graph Error:', err);
      setLoading(false);
    }
  };

  if (loading) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0c4de' }}>Loading Graph...</div>;
  if (!hasData) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0c4de' }}>No solves yet</div>;

  return (
    <div className="score-graph-container" style={{ width: '100%', height }}>
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};

export default ScoreGraph;
