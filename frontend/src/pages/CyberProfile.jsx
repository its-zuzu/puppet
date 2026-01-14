import { useContext, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AuthContext from '../context/AuthContext'
import axios from 'axios'
import Loading from '../components/Loading'
import './CyberProfile.css'

function CyberProfile() {
  const { user, isAuthenticated, loading } = useContext(AuthContext)
  const [solvedChallenges, setSolvedChallenges] = useState([])
  const [loadingChallenges, setLoadingChallenges] = useState(true)
  const [userRank, setUserRank] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch scoreboard for rank
        const scoreRes = await axios.get('/api/scoreboard')
        const rank = scoreRes.data.users.findIndex(u => u._id === user._id) + 1
        setUserRank(rank || null)

        // Fetch solved challenges
        if (user?.solvedChallenges?.length > 0) {
          const solved = []
          for (const challengeId of user.solvedChallenges) {
            try {
              const res = await axios.get(`/api/challenges/${challengeId}`)
              solved.push(res.data.data)
            } catch (err) {
              console.error(`Error fetching challenge ${challengeId}:`, err)
            }
          }
          setSolvedChallenges(solved)
        }
      } catch (err) {
        console.error('Error fetching profile data:', err)
      } finally {
        setLoadingChallenges(false)
      }
    }

    if (isAuthenticated && user) {
      fetchData()
    }
  }, [isAuthenticated, user])

  if (!loading && !isAuthenticated) {
    return <Navigate to="/login" />
  }

  if (loading || !user) {
    return <Loading text="LOADING PROFILE..." />
  }

  const totalPoints = user.points || 0
  const solveCount = solvedChallenges.length

  return (
    <div className="cyber-profile">
      <motion.div
        className="profile-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="profile-avatar">
          <div className="avatar-circle">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="avatar-glow"></div>
        </div>
        <div className="profile-info">
          <h1 className="profile-username">{user.username}</h1>
          <p className="profile-email">{user.email}</p>
        </div>
      </motion.div>

      <div className="profile-stats-grid">
        <motion.div
          className="stat-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="stat-icon">⬢</div>
          <div className="stat-content">
            <div className="stat-value">{totalPoints}</div>
            <div className="stat-label">TOTAL POINTS</div>
          </div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <div className="stat-value">{solveCount}</div>
            <div className="stat-label">CHALLENGES SOLVED</div>
          </div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="stat-icon">★</div>
          <div className="stat-content">
            <div className="stat-value">#{userRank || '-'}</div>
            <div className="stat-label">GLOBAL RANK</div>
          </div>
        </motion.div>
      </div>

      <motion.div
        className="profile-section cyber-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="section-title">
          <span className="title-icon">▸</span> USER DETAILS
        </h2>
        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">USERNAME:</span>
            <span className="detail-value">{user.username}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">EMAIL:</span>
            <span className="detail-value">{user.email}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">TEAM:</span>
            <span className="detail-value">{user.team || 'No Team'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">ROLE:</span>
            <span className="detail-value">{user.role || 'User'}</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="profile-section cyber-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="section-title">
          <span className="title-icon">▸</span> SOLVED CHALLENGES
        </h2>

        {loadingChallenges ? (
          <div className="loading-solves">
            <div className="cyber-spinner"></div>
            <p>Loading challenges...</p>
          </div>
        ) : solvedChallenges.length === 0 ? (
          <div className="empty-state">
            <p className="empty-text">No challenges solved yet</p>
            <p className="empty-subtext">Start hacking to see your progress!</p>
          </div>
        ) : (
          <div className="challenges-list">
            {solvedChallenges.map((challenge, index) => (
              <motion.div
                key={challenge._id}
                className="challenge-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
              >
                <div className="challenge-icon">✓</div>
                <div className="challenge-info">
                  <div className="challenge-name">{challenge.title}</div>
                  <div className="challenge-meta">
                    <span className="challenge-category">{challenge.category}</span>
                    <span className="challenge-points">+{challenge.points} pts</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default CyberProfile
