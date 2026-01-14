import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import ScoreGraph from '../components/ScoreGraph';
import Loading from '../components/Loading';
import CustomMessageDisplay from '../components/CustomMessageDisplay';
import { useEventState } from '../hooks/useEventState';
import './Scoreboard.css';

function Scoreboard() {
  const { eventState: ctfEventState, customMessage, isEnded } = useEventState();
  const { isAuthenticated } = useContext(AuthContext);
  const [viewType, setViewType] = useState('teams'); // 'teams' or 'users'
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check for custom message
  if (customMessage) {
    return <CustomMessageDisplay message={customMessage} />;
  }

  useEffect(() => {
    fetchScoreboard();
    const interval = setInterval(fetchScoreboard, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [viewType, isAuthenticated]);

  const fetchScoreboard = async () => {
    try {
      const res = await axios.get(`/api/v1/scoreboard?type=${viewType}`);
      if (res.data.success) {
        setStandings(res.data.data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Scoreboard load error:', err);
      setLoading(false);
    }
  };

  return (
    <div className="scoreboard-container">
      <h1 className="scoreboard-title">Scoreboard</h1>

      {/* Tabs */}
      <div className="scoreboard-tabs">
        <button
          onClick={() => setViewType('teams')}
          className={`tab-button ${viewType === 'teams' ? 'active' : ''}`}
        >
          Teams
        </button>
        <button
          onClick={() => setViewType('users')}
          className={`tab-button ${viewType === 'users' ? 'active' : ''}`}
        >
          Users
        </button>
      </div>

      {/* Graph */}
      <div className="graph-container">
        <h3 className="graph-title">Top 10 Trend</h3>
        <ScoreGraph key={viewType} type={viewType} limit={10} />
      </div>

      {/* Table */}
      <div className="scoreboard-table-container">
        <table className="scoreboard-table">
          <thead>
            <tr>
              <th style={{ width: '80px', textAlign: 'center' }}>Place</th>
              <th>{viewType === 'teams' ? 'Team' : 'User'}</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" className="loading-cell"><Loading size="small" inline text="Loading" /></td></tr>
            ) : standings.length === 0 ? (
              <tr><td colSpan="3" className="empty-cell">No visible solves yet</td></tr>
            ) : (
              standings.map((entry, idx) => (
                <tr
                  key={entry.account_id}
                  className={idx < 3 ? 'top-rank' : ''}
                >
                  <td className={`rank-cell ${idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : ''}`}>
                    {entry.pos}
                  </td>
                  <td>
                    <a href={entry.account_url} className="team-link">
                      {entry.name}
                    </a>
                  </td>
                  <td className="score-cell">
                    {entry.score}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Scoreboard;
