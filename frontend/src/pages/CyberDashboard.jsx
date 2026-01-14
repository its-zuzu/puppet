import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import AuthContext from '../context/AuthContext'
import axios from 'axios'
import './CyberDashboard.css'

function CyberDashboard() {
  const { user } = useContext(AuthContext)
  const [stats, setStats] = useState({
    totalPoints: 0,
    solvedChallenges: 0,
    rank: '-',
    totalUsers: 0
  })
  const [recentSolves, setRecentSolves] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [profileRes, scoreboardRes] = await Promise.all([
        axios.get('/api/auth/profile'),
        axios.get('/api/scoreboard')
      ])

      const userRank = scoreboardRes.data.users.findIndex(
        u => u._id === profileRes.data.data._id
      ) + 1

      setStats({
        totalPoints: profileRes.data.data.points || 0,
        solvedChallenges: profileRes.data.data.solvedChallenges?.length || 0,
        rank: userRank || '-',
        totalUsers: scoreboardRes.data.total || 0
      })

      setRecentSolves(profileRes.data.data.solvedChallenges?.slice(-5).reverse() || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="cyber-dashboard-loading">
        <div className="cyber-spinner"></div>
        <p className="loading-text">LOADING DASHBOARD<span className="terminal-cursor"></span></p>
      </div>
    )
  }

  return (
    <div className="cyber-dashboard">
      <motion.div
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="dashboard-title">
          <span className="title-icon">◆</span>
          MISSION CONTROL
        </h1>
        <p className="dashboard-subtitle">
          Welcome back, <span className="user-name">{user?.username}</span>
        </p>
      </motion.div>

      <div className="dashboard-grid">
        <motion.div
          className="stat-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="stat-icon points">⬢</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalPoints}</div>
            <div className="stat-label">TOTAL POINTS</div>
          </div>
          <div className="stat-glow"></div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="stat-icon solves">✓</div>
          <div className="stat-content">
            <div className="stat-value">{stats.solvedChallenges}</div>
            <div className="stat-label">CHALLENGES SOLVED</div>
          </div>
          <div className="stat-glow"></div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="stat-icon rank">★</div>
          <div className="stat-content">
            <div className="stat-value">#{stats.rank}</div>
            <div className="stat-label">GLOBAL RANK</div>
          </div>
          <div className="stat-glow"></div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="stat-icon users">⬡</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalUsers}</div>
            <div className="stat-label">ACTIVE USERS</div>
          </div>
          <div className="stat-glow"></div>
        </motion.div>
      </div>

      <div className="dashboard-content">
        <motion.div
          className="quick-actions cyber-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="section-title">
            <span className="title-icon">▸</span> QUICK ACCESS
          </h3>
          <div className="action-buttons">
            <Link to="/challenges" className="action-btn">
              <span className="btn-icon">▸</span>
              BROWSE CHALLENGES
            </Link>
            <Link to="/scoreboard" className="action-btn">
              <span className="btn-icon">▸</span>
              VIEW SCOREBOARD
            </Link>
            <Link to="/my-team" className="action-btn">
              <span className="btn-icon">▸</span>
              TEAM STATUS
            </Link>
            <Link to="/profile" className="action-btn">
              <span className="btn-icon">▸</span>
              PROFILE SETTINGS
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="recent-activity cyber-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="section-title">
            <span className="title-icon">▸</span> RECENT SOLVES
          </h3>
          {recentSolves.length > 0 ? (
            <div className="activity-list">
              {recentSolves.map((solve, index) => (
                <motion.div
                  key={solve._id || index}
                  className="activity-item"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                >
                  <div className="activity-icon">✓</div>
                  <div className="activity-info">
                    <div className="activity-name">{solve.name || 'Challenge'}</div>
                    <div className="activity-points">+{solve.points || 0} points</div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-text">No challenges solved yet</p>
              <Link to="/challenges" className="empty-link">
                Start solving →
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default CyberDashboard
