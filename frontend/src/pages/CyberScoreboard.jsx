import { useState, useEffect, useContext } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import AuthContext from '../context/AuthContext'
import ScoreGraph from '../components/ScoreGraph'
import Loading from '../components/Loading'
import CustomMessageDisplay from '../components/CustomMessageDisplay'
import CTFEndedDisplay from '../components/CTFEndedDisplay'
import { useEventState } from '../hooks/useEventState'
import './CyberScoreboard.css'

function CyberScoreboard() {
  const { user } = useContext(AuthContext)
  const [viewType, setViewType] = useState('users')
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const { state: eventState, loading: eventLoading } = useEventState()

  useEffect(() => {
    fetchScoreboard()
    const interval = setInterval(fetchScoreboard, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchScoreboard = async () => {
    try {
      const res = await axios.get('/api/scoreboard')
      setStandings(res.data.users || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching scoreboard:', error)
      setLoading(false)
    }
  }

  if (eventLoading || loading) {
    return <Loading text="LOADING SCOREBOARD..." />
  }

  if (eventState?.ended) {
    return <CTFEndedDisplay />
  }

  if (eventState?.customMessage) {
    return <CustomMessageDisplay message={eventState.customMessage} />
  }

  const getRankColor = (rank) => {
    if (rank === 1) return '#FFD700'
    if (rank === 2) return '#C0C0C0'
    if (rank === 3) return '#CD7F32'
    return '#00ff41'
  }

  return (
    <div className="cyber-scoreboard">
      <motion.div
        className="scoreboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="scoreboard-title">
          <span className="title-icon">★</span>
          GLOBAL LEADERBOARD
        </h1>
        <p className="scoreboard-subtitle">TOP HACKERS RANKING</p>
      </motion.div>

      {/* IMPORTANT: Preserved ScoreGraph Component */}
      <motion.div
        className="score-graph-container cyber-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="section-title">
          <span className="title-icon">▸</span> SCORE PROGRESSION
        </h3>
        <ScoreGraph />
      </motion.div>

      <motion.div
        className="leaderboard-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="leaderboard-header">
          <div className="rank-col">RANK</div>
          <div className="user-col">HACKER</div>
          <div className="score-col">POINTS</div>
          <div className="solves-col">SOLVES</div>
        </div>

        <div className="leaderboard-body">
          {standings.map((entry, index) => {
            const rank = index + 1
            const isCurrentUser = user?._id === entry._id
            
            return (
              <motion.div
                key={entry._id}
                className={`leaderboard-row ${isCurrentUser ? 'current-user' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                whileHover={{ x: 5 }}
              >
                <div className="rank-col">
                  <span
                    className="rank-badge"
                    style={{ color: getRankColor(rank) }}
                  >
                    {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
                  </span>
                </div>
                
                <div className="user-col">
                  <div className="user-info">
                    <span className="username">{entry.username}</span>
                    {entry.team && <span className="team-name">{entry.team}</span>}
                  </div>
                </div>
                
                <div className="score-col">
                  <span className="points-value">{entry.points || 0}</span>
                  <span className="points-label">PTS</span>
                </div>
                
                <div className="solves-col">
                  <span className="solves-value">{entry.solvedChallenges?.length || 0}</span>
                </div>

                {isCurrentUser && <div className="current-user-glow"></div>}
              </motion.div>
            )
          })}
        </div>

        {standings.length === 0 && (
          <div className="empty-leaderboard">
            <p className="empty-text">No scores recorded yet</p>
            <p className="empty-subtext">Be the first to solve challenges!</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default CyberScoreboard
