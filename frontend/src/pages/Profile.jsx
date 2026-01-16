import { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, Mail, Award, Trophy, Calendar, Shield, 
  TrendingUp, Clock, CheckCircle, Target, Users 
} from 'lucide-react';
import AuthContext from '../context/AuthContext';
import axios from 'axios';
import { Loading } from '../components/ui';
import './UserProfile.css';

const DIFFICULTIES = {
  easy: { label: 'Easy', color: '#00ff00', icon: '●' },
  medium: { label: 'Medium', color: '#ffaa00', icon: '●' },
  hard: { label: 'Hard', color: '#ff6b6b', icon: '●' },
  insane: { label: 'Insane', color: '#ff00ff', icon: '●' },
};

function Profile() {
  const { user, isAuthenticated, loading } = useContext(AuthContext);
  const [solvedChallenges, setSolvedChallenges] = useState([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalSolves: 0,
    rank: 0,
    easyCount: 0,
    mediumCount: 0,
    hardCount: 0,
    insaneCount: 0
  });

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        if (user && user.solvedChallenges && user.solvedChallenges.length > 0) {
          const solved = [];
          
          for (const challengeId of user.solvedChallenges) {
            try {
              const res = await axios.get(`/api/challenges/${challengeId}`);
              const challenge = res.data.data;
              solved.push(challenge);
            } catch (err) {
              console.error(`Error fetching challenge ${challengeId}:`, err);
            }
          }
          
          setSolvedChallenges(solved);
          setStats({
            totalPoints: user.points || 0,
            totalSolves: solved.length,
            rank: user.rank || 0
          });
        } else {
          setStats({
            totalPoints: user?.points || 0,
            totalSolves: 0,
            rank: user?.rank || 0
          });
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
    return <Navigate to="/login" replace />;
  }

  if (loading || !user) {
    return (
      <div className="htb-user-container">
        <div className="htb-user-grid-bg"></div>
        <Loading text="LOADING PROFILE..." />
      </div>
    );
  }

  return (
    <div className="htb-user-container">
      <div className="htb-user-grid-bg"></div>
      
      {/* Header */}
      <motion.div 
        className="htb-user-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="htb-user-avatar">
          <User size={48} />
        </div>
        <div className="htb-user-info">
          <h1 className="htb-user-name">{user.username}</h1>
          <div className="htb-user-meta">
            <span className="htb-user-email">
              <Mail size={16} />
              {user.email}
            </span>
            {user.team && (
              <span className="htb-user-team">
                <Users size={16} />
                Team: {user.team.name || user.team}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        className="htb-user-stats-grid"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div 
          className="htb-stat-card htb-stat-primary"
          whileHover={{ y: -5 }}
        >
          <div className="htb-stat-icon">
            <Award />
          </div>
          <div className="htb-stat-content">
            <span className="htb-stat-value">{stats.totalPoints}</span>
            <span className="htb-stat-label">Total Points</span>
          </div>
        </motion.div>

        <motion.div 
          className="htb-stat-card htb-stat-success"
          whileHover={{ y: -5 }}
        >
          <div className="htb-stat-icon">
            <CheckCircle />
          </div>
          <div className="htb-stat-content">
            <span className="htb-stat-value">{stats.totalSolves}</span>
            <span className="htb-stat-label">Challenges Solved</span>
          </div>
        </motion.div>

        <motion.div 
          className="htb-stat-card htb-stat-warning"
          whileHover={{ y: -5 }}
        >
          <div className="htb-stat-icon">
            <TrendingUp />
          </div>
          <div className="htb-stat-content">
            <span className="htb-stat-value">#{stats.rank || '???'}</span>
            <span className="htb-stat-label">Global Rank</span>
          </div>
        </motion.div>

        <motion.div 
          className="htb-stat-card htb-stat-info"
          whileHover={{ y: -5 }}
        >
          <div className="htb-stat-icon">
            <Calendar />
          </div>
          <div className="htb-stat-content">
            <span className="htb-stat-value">
              {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric'
              })}
            </span>
            <span className="htb-stat-label">Member Since</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Solved Challenges */}
      <motion.div
        className="htb-user-challenges"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="htb-section-header">
          <Trophy size={24} />
          <h2>Solved Challenges</h2>
        </div>
        
        {loadingChallenges ? (
          <div className="htb-loading-state">
            <Loading text="LOADING CHALLENGES..." />
          </div>
        ) : solvedChallenges.length > 0 ? (
          <div className="htb-challenges-grid">
            {solvedChallenges.map((challenge, index) => (
              <motion.div
                key={challenge._id}
                className="htb-challenge-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                whileHover={{ y: -3, boxShadow: '0 0 20px rgba(0, 180, 255, 0.3)' }}
              >
                <div className="htb-challenge-header">
                  <CheckCircle className="htb-solve-icon" size={18} />
                  <h3 className="htb-challenge-title">{challenge.title}</h3>
                </div>
                <div className="htb-challenge-meta">
                  <span 
                    className="htb-difficulty" 
                    style={{ 
                      color: DIFFICULTIES[challenge.difficulty?.toLowerCase()]?.color || '#999',
                      borderColor: DIFFICULTIES[challenge.difficulty?.toLowerCase()]?.color || '#999'
                    }}
                  >
                    {DIFFICULTIES[challenge.difficulty?.toLowerCase()]?.icon || '●'} 
                    {DIFFICULTIES[challenge.difficulty?.toLowerCase()]?.label || challenge.difficulty}
                  </span>
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
            <Target size={64} />
            <h3>No challenges solved yet</h3>
            <p>Start solving challenges to see your progress here</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default Profile;
