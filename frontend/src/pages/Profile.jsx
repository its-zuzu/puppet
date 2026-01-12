import { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from 'axios';
import Loading from '../components/Loading';
import './Profile.css';

function Profile() {
  const { user, isAuthenticated, loading } = useContext(AuthContext);
  const [solvedChallenges, setSolvedChallenges] = useState([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        if (user && user.solvedChallenges && user.solvedChallenges.length > 0) {
          const solved = [];
          for (const challengeId of user.solvedChallenges) {
            try {
              const res = await axios.get(`/api/challenges/${challengeId}`);
              solved.push(res.data.data);
            } catch (err) {
              console.error(`Error fetching challenge ${challengeId}:`, err);
            }
          }
          setSolvedChallenges(solved);
        }
      } catch (err) {
        console.error('Error fetching challenges:', err);
      } finally {
        setLoadingChallenges(false);
      }
    };

    if (isAuthenticated && user) {
      fetchChallenges();
    }
  }, [isAuthenticated, user]);

  if (!loading && !isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (loading || !user) {
    return (
      <div className="profile-container">
        <Loading size="medium" text="Loading profile" />
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* User Details Section */}
      <div className="profile-section user-details-section">
        <h2>User Details</h2>
        <div className="user-details-grid">
          <div className="detail-item">
            <span className="detail-label">Username:</span>
            <span className="detail-value">{user.username}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Email:</span>
            <span className="detail-value">{user.email}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Role:</span>
            <span className="detail-value">{user.role}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Member Since:</span>
            <span className="detail-value">
              {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Points:</span>
            <span className="detail-value highlight">{user.points || 0}</span>
          </div>
        </div>
      </div>

      {/* Challenges Solved Summary */}
      <div className="profile-section challenges-summary-section">
        <h2>Challenges Solved</h2>
        <div className="solved-count">
          <span className="count-number">{user.solvedChallenges?.length || 0}</span>
          <span className="count-label">Total Challenges Solved</span>
        </div>
      </div>

      {/* Solved Challenges List */}
      <div className="profile-section solved-challenges-section">
        <h2>Solved Challenges Details</h2>
        {loadingChallenges ? (
          <Loading size="small" inline text="Loading challenges" />
        ) : solvedChallenges.length > 0 ? (
          <div className="solved-challenges-list">
            {solvedChallenges.map(challenge => (
              <div key={challenge._id} className="solved-challenge-item">
                <div className="challenge-title">{challenge.title}</div>
                <div className="challenge-details">
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
            <p>No challenges solved yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
