import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import './UserProfile.css';

function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchUserProfile();
  }, [userId, isAuthenticated, navigate]);

  const fetchUserProfile = async () => {
    try {
      const [userRes, challengesRes] = await Promise.all([
        axios.get(`/api/auth/user/${userId}`),
        axios.get('/api/challenges')
      ]);

      setUser(userRes.data.user);
      setChallenges(challengesRes.data.data || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch user profile');
      setLoading(false);
    }
  };

  const getSolvedChallenges = () => {
    if (!user?.solvedChallenges || !challenges.length) return [];
    
    return challenges.filter(challenge => 
      user.solvedChallenges.includes(challenge._id)
    );
  };

  if (loading) {
    return (
      <div className="user-profile-container">
        <div className="loading">Loading user profile...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="user-profile-container">
        <div className="error">{error || 'User not found'}</div>
        <button onClick={() => navigate('/scoreboard')} className="back-btn">
          ← Back to Scoreboard
        </button>
      </div>
    );
  }

  const solvedChallenges = getSolvedChallenges();

  return (
    <div className="user-profile-container">
      <div className="profile-header">
        <button onClick={() => navigate('/scoreboard')} className="back-btn">
          ← Back to Scoreboard
        </button>
        <h1>{user.username}</h1>
      </div>

      <div className="profile-content">
        <div className="profile-stats">
          <div className="stat-card">
            <h3>Total Points</h3>
            <div className="stat-value">{user.points || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Challenges Solved</h3>
            <div className="stat-value">{user.solvedChallenges?.length || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Hints Unlocked</h3>
            <div className="stat-value">{user.unlockedHints?.length || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Team</h3>
            <div className="stat-value">{user.team?.name || 'No Team'}</div>
          </div>
        </div>

        <div className="solved-challenges">
          <h2>Solved Challenges ({solvedChallenges.length})</h2>
          {solvedChallenges.length > 0 ? (
            <div className="challenges-grid">
              {solvedChallenges.map(challenge => (
                <div key={challenge._id} className="challenge-card">
                  <h3>{challenge.title}</h3>
                  <div className="challenge-meta">
                    <span className={`difficulty ${challenge.difficulty.toLowerCase()}`}>
                      {challenge.difficulty}
                    </span>
                    <span className="category">{challenge.category}</span>
                    <span className="points">{challenge.points} pts</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-challenges">
              No challenges solved yet
            </div>
          )}
        </div>

        {/* Unlocked Hints Section */}
        {user.unlockedHints && user.unlockedHints.length > 0 && (
          <div className="unlocked-hints">
            <h2>Unlocked Hints ({user.unlockedHints.length})</h2>
            <div className="hints-grid">
              {user.unlockedHints.map((hint, idx) => (
                <div key={idx} className="hint-card">
                  <div className="hint-card-header">
                    <h3>{hint.challengeTitle || 'Unknown Challenge'}</h3>
                    <span className="hint-cost-badge">{hint.hintCost} pts</span>
                  </div>
                  <div className="hint-card-meta">
                    <span className="hint-date">
                      {new Date(hint.unlockedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfile;