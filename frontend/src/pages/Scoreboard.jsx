import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import './Scoreboard.css';

/**
 * CTFd-Style Scoreboard Component
 * 
 * Displays team/user rankings with:
 * - Real-time updates
 * - Tie-breaking by solve time
 * - Clean table layout
 */
function Scoreboard() {
  const { isAuthenticated, token } = useContext(AuthContext);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [viewType, setViewType] = useState('teams');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchScoreboard();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchScoreboard, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, viewType]);

  const fetchScoreboard = async () => {
    try {
      if (!isAuthenticated) {
        setError('Please login to view the scoreboard');
        setLoading(false);
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      // Fetch both teams and users
      const [teamsRes, usersRes] = await Promise.all([
        axios.get('/api/v1/scoreboard?type=teams', config),
        axios.get('/api/v1/scoreboard?type=users', config)
      ]);

      setTeams(teamsRes.data.data || []);
      setUsers(usersRes.data.data || []);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Scoreboard fetch error:', err);
      setError('Failed to load scoreboard');
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="scoreboard-container">
        <div className="error">Please login to view the scoreboard</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="scoreboard-container">
        <div className="loading">Loading scoreboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="scoreboard-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  const currentData = viewType === 'teams' ? teams : users;

  return (
    <div className="scoreboard-container">
      <div className="scoreboard-header">
        <h1>Scoreboard</h1>
      </div>

      {/* View Toggle */}
      <div className="scoreboard-tabs">
        <button
          className={viewType === 'teams' ? 'tab-active' : 'tab'}
          onClick={() => setViewType('teams')}
        >
          Teams
        </button>
        <button
          className={viewType === 'users' ? 'tab-active' : 'tab'}
          onClick={() => setViewType('users')}
        >
          Users
        </button>
      </div>

      {/* Scoreboard Table */}
      <div className="scoreboard-table-container">
        <table className="scoreboard-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Rank</th>
              <th>{viewType === 'teams' ? 'Team' : 'User'}</th>
              <th style={{ width: '120px' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '40px' }}>
                  No entries yet
                </td>
              </tr>
            ) : (
              currentData.map((entry, index) => (
                <tr key={entry.account_id || index}>
                  <td className="rank-cell">{index + 1}</td>
                  <td className="name-cell">
                    {entry.name}
                    {entry.bracket_name && (
                      <span className="bracket-badge">{entry.bracket_name}</span>
                    )}
                  </td>
                  <td className="score-cell">{entry.score}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Auto-refresh indicator */}
      <div className="refresh-notice">
        Updates automatically every 30 seconds
      </div>
    </div>
  );
}

export default Scoreboard;
