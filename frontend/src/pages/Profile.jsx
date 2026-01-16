import { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, Trophy, Lock, Users, Flag, Medal } from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Loading } from '../components/ui';
import './UserProfile.css';

function Profile() {
  const { user: authUser, isAuthenticated, loading: authLoading, updateUserData } = useContext(AuthContext);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchData();
    }
  }, [authLoading, isAuthenticated]);

  const fetchData = async () => {
    try {
      // Refresh user data to get latest rank and stats
      await updateUserData();
      
      // Fetch all challenges to get solved challenge details
      const challengesRes = await axios.get('/api/challenges');
      setChallenges(challengesRes.data.data || []);
    } catch (err) {
      console.error('Error fetching profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSolvedChallenges = () => {
    if (!authUser?.solvedChallenges || !Array.isArray(authUser.solvedChallenges)) return [];
    
    // If solvedChallenges already has challenge details, use them directly
    if (authUser.solvedChallenges.length > 0 && authUser.solvedChallenges[0]?.title) {
      return authUser.solvedChallenges;
    }
    
    // Fallback: if it's just IDs, filter from challenges list
    if (!challenges.length) return [];
    return challenges.filter(challenge => 
      authUser.solvedChallenges.includes(challenge._id)
    );
  };

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (authLoading || loading || !authUser) {
    return (
      <div className="htb-user-container">
        <div className="htb-user-grid-bg"></div>
        <Loading text="LOADING PROFILE..." />
      </div>
    );
  }

  const solvedChallenges = getSolvedChallenges();

  return (
    <div className="htb-user-container">
      <div className="htb-user-grid-bg"></div>
      
      <motion.div 
        className="htb-user-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="htb-user-name">{authUser.username}</h1>
      </motion.div>

      <div className="htb-user-main">
        <motion.div 
          className="htb-user-stats"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div 
            className="htb-stat-card"
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <div className="htb-stat-icon">
              <Trophy size={24} />
            </div>
            <div className="htb-stat-content">
              <div className="htb-stat-label">Total Points</div>
              <div className="htb-stat-value">{authUser.points || 0}</div>
            </div>
          </motion.div>

          <motion.div 
            className="htb-stat-card"
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <div className="htb-stat-icon">
              <Flag size={24} />
            </div>
            <div className="htb-stat-content">
              <div className="htb-stat-label">Challenges Solved</div>
              <div className="htb-stat-value">{authUser.challengesSolvedCount || authUser.solvedChallenges?.length || 0}</div>
            </div>
          </motion.div>

          <motion.div 
            className="htb-stat-card"
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <div className="htb-stat-icon">
              <Medal size={24} />
            </div>
            <div className="htb-stat-content">
              <div className="htb-stat-label">Rank</div>
              <div className="htb-stat-value">#{authUser.rank || '-'}</div>
            </div>
          </motion.div>

          <motion.div 
            className="htb-stat-card"
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <div className="htb-stat-icon">
              <Lock size={24} />
            </div>
            <div className="htb-stat-content">
              <div className="htb-stat-label">Hints Unlocked</div>
              <div className="htb-stat-value">{authUser.unlockedHints?.length || 0}</div>
            </div>
          </motion.div>

          <motion.div 
            className="htb-stat-card"
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <div className="htb-stat-icon">
              <Users size={24} />
            </div>
            <div className="htb-stat-content">
              <div className="htb-stat-label">Team</div>
              <div className="htb-stat-value htb-stat-team">
                {authUser.team?.name || 'No Team'}
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div 
          className="htb-user-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="htb-section-title">
            <span className="htb-title-line"></span>
            Solved Challenges ({solvedChallenges.length})
          </h2>
          {solvedChallenges.length > 0 ? (
            <div className="htb-challenges-grid">
              {solvedChallenges.map((challenge, index) => (
                <motion.div 
                  key={challenge._id}
                  className="htb-challenge-card"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                >
                  <h3 className="htb-challenge-title">{challenge.title}</h3>
                  <div className="htb-challenge-meta">
                    <span className="htb-category">{challenge.category}</span>
                    <span className="htb-points">
                      <Award size={14} />
                      {challenge.points} pts
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="htb-empty-state">
              <Flag size={48} />
              <p>No challenges solved yet</p>
            </div>
          )}
        </motion.div>

        {authUser.unlockedHints && authUser.unlockedHints.length > 0 && (
          <motion.div 
            className="htb-user-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="htb-section-title">
              <span className="htb-title-line"></span>
              Unlocked Hints ({authUser.unlockedHints.length})
            </h2>
            <div className="htb-hints-grid">
              {authUser.unlockedHints.map((hint, idx) => (
                <motion.div 
                  key={idx}
                  className="htb-hint-card"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + idx * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="htb-hint-header">
                    <Lock size={18} />
                    <div className="htb-hint-info">
                      <h3>{hint.challengeName || 'Unknown Challenge'}</h3>
                      <span className="htb-hint-index">Hint #{hint.hintIndex + 1}</span>
                    </div>
                  </div>
                  <div className="htb-hint-meta">
                    <span className="htb-hint-cost">-{hint.cost || 0} pts</span>
                    <span className="htb-hint-date">
                      {new Date(hint.unlockedAt).toLocaleDateString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default Profile;
