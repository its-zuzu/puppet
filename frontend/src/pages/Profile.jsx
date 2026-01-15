import { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, Mail, Award, Trophy, Calendar, Shield, 
  TrendingUp, Clock, CheckCircle, Target 
} from 'lucide-react';
import AuthContext from '../context/AuthContext';
import axios from 'axios';
import { Card, CardHeader, CardBody, Badge, Loading } from '../components/ui';
import './Profile.css';

const DIFFICULTIES = {
  easy: { label: 'Easy', color: 'success' },
  medium: { label: 'Medium', color: 'warning' },
  hard: { label: 'Hard', color: 'danger' },
  insane: { label: 'Insane', color: 'info' },
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
    return <Navigate to="/login" />;
  }

  if (loading || !user) {
    return (
      <div className="profile-page">
        <Loading size="large" text="Loading profile..." />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="profile-page">
      {/* Header */}
      <motion.div 
        className="profile-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="profile-avatar">
          <User size={40} />
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{user.username}</h1>
          <p className="profile-email">
            <Mail size={16} />
            {user.email}
          </p>
          {user.team && (
            <p className="profile-team">
              <Shield size={16} />
              Team: {user.team.name || user.team}
            </p>
          )}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        className="stats-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card className="stat-card stat-card--primary" hover>
            <CardBody>
              <div className="stat-card-icon">
                <Award />
              </div>
              <div className="stat-card-content">
                <span className="stat-card-value">{stats.totalPoints}</span>
                <span className="stat-card-label">Total Points</span>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="stat-card stat-card--success" hover>
            <CardBody>
              <div className="stat-card-icon">
                <CheckCircle />
              </div>
              <div className="stat-card-content">
                <span className="stat-card-value">{stats.totalSolves}</span>
                <span className="stat-card-label">Challenges Solved</span>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="stat-card stat-card--warning" hover>
            <CardBody>
              <div className="stat-card-icon">
                <TrendingUp />
              </div>
              <div className="stat-card-content">
                <span className="stat-card-value">#{stats.rank || '???'}</span>
                <span className="stat-card-label">Global Rank</span>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="stat-card stat-card--info" hover>
            <CardBody>
              <div className="stat-card-icon">
                <Calendar />
              </div>
              <div className="stat-card-content">
                <span className="stat-card-value">
                  {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
                <span className="stat-card-label">Member Since</span>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </motion.div>

      {/* Solved Challenges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="challenges-card">
          <CardHeader>
            <h2 className="section-title">
              <Trophy size={20} />
              Solved Challenges
            </h2>
          </CardHeader>
          <CardBody>
            {loadingChallenges ? (
              <Loading size="small" text="Loading challenges..." />
            ) : solvedChallenges.length > 0 ? (
              <div className="solved-challenges-list">
                {solvedChallenges.map((challenge, index) => (
                  <motion.div
                    key={challenge._id}
                    className="solved-challenge-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                  >
                    <CheckCircle className="solve-icon" size={20} />
                    <div className="challenge-info">
                      <div className="challenge-name">{challenge.title}</div>
                      <div className="challenge-metadata">
                        <Badge variant={DIFFICULTIES[challenge.difficulty?.toLowerCase()]?.color || 'primary'}>
                          {DIFFICULTIES[challenge.difficulty?.toLowerCase()]?.label || challenge.difficulty}
                        </Badge>
                        <span className="challenge-category">{challenge.category}</span>
                        <span className="challenge-points">
                          <Award size={14} />
                          {challenge.points} pts
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="no-challenges">
                <Target size={48} />
                <h3>No challenges solved yet</h3>
                <p>Start solving challenges to see your progress here</p>
              </div>
            )}
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}

export default Profile;
