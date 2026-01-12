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
      const colors = [
        '#36A2EB', '#FF6384', '#4BC0C0', '#FF9F40', '#9966FF',
        '#FFCD56', '#C9CBCF', '#E7E9ED', '#7Fb285', '#F55D3E'
      ];

      Object.values(data).forEach((team, index) => {
        const timeSeries = team.data.map(d => [d.time, d.score]);

        // Add current time point to extend line to right edge if needed
        // CTFd usually does this to make the graph look "up to date"
        if (timeSeries.length > 0) {
          const lastPoint = timeSeries[timeSeries.length - 1];
          timeSeries.push([new Date().getTime(), lastPoint[1]]);
        } else {
          // Handle 0 solves teams? Usually graph only shows people with points.
          // But if they have points but no events (award?) they need a flat line from start.
        }

        series.push({
          name: team.name,
          type: 'line',
          data: timeSeries,
          showSymbol: true,
          symbolSize: 6,
          itemStyle: { color: colors[index % colors.length] },
          lineStyle: { width: 3 },
          smooth: true, // CTFd uses slight smoothing or straight lines? Usually straight. switching to false if needed. CTFd is straight.
        });
        legendData.push(team.name);
      });

      const chartOption = {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' },
          formatter: (params) => {
            // Custom tooltip to match nice format
            let result = `<b>${params[0].axisValueLabel}</b><br/>`;
            params.sort((a, b) => b.data[1] - a.data[1]); // Sort by score DESC in tooltip
            params.forEach(item => {
              result += `${item.marker} ${item.seriesName}: <b>${item.data[1]}</b><br/>`;
            });
            return result;
          }
        },
        legend: {
          data: legendData,
          type: 'scroll',
          textStyle: { color: '#b0c4de' }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'time',
          boundaryGap: false,
          axisLabel: { color: '#b0c4de' },
          splitLine: { show: false }
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: '#b0c4de' },
          splitLine: { lineStyle: { color: '#2b3e50', type: 'dashed' } }
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
