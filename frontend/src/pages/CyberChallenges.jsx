import { useState, useEffect, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import AuthContext from '../context/AuthContext'
import { useEventState } from '../hooks/useEventState'
import Loading from '../components/Loading'
import CustomMessageDisplay from '../components/CustomMessageDisplay'
import CTFEndedDisplay from '../components/CTFEndedDisplay'
import './CyberChallenges.css'

const categories = {
  all: { name: 'ALL', icon: '◆', color: '#00ff41' },
  web: { name: 'WEB', icon: '⬢', color: '#00d9ff' },
  crypto: { name: 'CRYPTO', icon: '⬡', color: '#bd00ff' },
  forensics: { name: 'FORENSICS', icon: '◈', color: '#ff0055' },
  rev: { name: 'REVERSE', icon: '◇', color: '#ffaa00' },
  pwn: { name: 'BINARY', icon: '◆', color: '#00ff41' },
  misc: { name: 'MISC', icon: '⬟', color: '#00d9ff' }
}

function CyberChallenges() {
  const { user } = useContext(AuthContext)
  const [challenges, setChallenges] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const [flag, setFlag] = useState('')
  const [submitMessage, setSubmitMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { state: eventState, loading: eventLoading } = useEventState()

  useEffect(() => {
    fetchChallenges()
  }, [])

  const fetchChallenges = async () => {
    try {
      const res = await axios.get('/api/challenges')
      setChallenges(res.data.data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching challenges:', error)
      setLoading(false)
    }
  }

  const handleSubmitFlag = async (e) => {
    e.preventDefault()
    if (!flag.trim()) {
      setSubmitMessage({ type: 'error', text: 'INVALID FLAG FORMAT' })
      return
    }

    setIsSubmitting(true)
    setSubmitMessage(null)

    try {
      const res = await axios.post(`/api/challenges/${selectedChallenge._id}/submit`, { flag })
      setSubmitMessage({ type: 'success', text: `✓ CORRECT! +${res.data.data.points} POINTS` })
      setFlag('')
      
      setTimeout(() => {
        fetchChallenges()
        setSelectedChallenge(null)
        setSubmitMessage(null)
      }, 2000)
    } catch (error) {
      const message = error.response?.data?.message || 'SUBMISSION FAILED'
      setSubmitMessage({ type: 'error', text: `✗ ${message}` })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (eventLoading || loading) {
    return <Loading text="LOADING CHALLENGES..." />
  }

  if (eventState?.ended) {
    return <CTFEndedDisplay />
  }

  if (eventState?.customMessage) {
    return <CustomMessageDisplay message={eventState.customMessage} />
  }

  const filteredChallenges = selectedCategory === 'all'
    ? challenges
    : challenges.filter(c => c.category.toLowerCase() === selectedCategory)

  const getDifficultyColor = (points) => {
    if (points <= 100) return '#00ff41'
    if (points <= 300) return '#00d9ff'
    if (points <= 500) return '#bd00ff'
    return '#ff0055'
  }

  return (
    <div className="cyber-challenges">
      <motion.div
        className="challenges-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="challenges-title">
          <span className="title-icon">▸</span>
          ACTIVE MISSIONS
        </h1>
        <p className="challenges-subtitle">{challenges.length} TARGETS AVAILABLE</p>
      </motion.div>

      <div className="category-filter">
        {Object.entries(categories).map(([key, cat]) => (
          <motion.button
            key={key}
            className={`category-btn ${selectedCategory === key ? 'active' : ''}`}
            onClick={() => setSelectedCategory(key)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              borderColor: selectedCategory === key ? cat.color : 'rgba(0, 255, 65, 0.3)',
              color: selectedCategory === key ? cat.color : '#00ff41'
            }}
          >
            <span className="cat-icon">{cat.icon}</span>
            {cat.name}
          </motion.button>
        ))}
      </div>

      <div className="challenges-grid">
        <AnimatePresence mode="wait">
          {filteredChallenges.map((challenge, index) => {
            const isSolved = user?.solvedChallenges?.includes(challenge._id)
            
            return (
              <motion.div
                key={challenge._id}
                className={`challenge-card ${isSolved ? 'solved' : ''}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedChallenge(challenge)}
                whileHover={{ y: -5 }}
              >
                <div className="challenge-header">
                  <div className="challenge-category"
                    style={{
                      borderColor: categories[challenge.category.toLowerCase()]?.color || '#00ff41',
                      color: categories[challenge.category.toLowerCase()]?.color || '#00ff41'
                    }}
                  >
                    {categories[challenge.category.toLowerCase()]?.icon || '◆'} {challenge.category}
                  </div>
                  {isSolved && <div className="solved-badge">✓ SOLVED</div>}
                </div>
                
                <h3 className="challenge-title">{challenge.title}</h3>
                
                <p className="challenge-description">
                  {challenge.description.substring(0, 100)}
                  {challenge.description.length > 100 ? '...' : ''}
                </p>
                
                <div className="challenge-footer">
                  <div className="challenge-points"
                    style={{ color: getDifficultyColor(challenge.points) }}
                  >
                    {challenge.points} PTS
                  </div>
                  <div className="challenge-solves">
                    {challenge.solves || 0} solves
                  </div>
                </div>
                
                <div className="challenge-glow"></div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedChallenge && (
          <motion.div
            className="challenge-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedChallenge(null)}
          >
            <motion.div
              className="challenge-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">
                  <span className="title-icon">{categories[selectedChallenge.category.toLowerCase()]?.icon || '◆'}</span>
                  {selectedChallenge.title}
                </h2>
                <button className="modal-close" onClick={() => setSelectedChallenge(null)}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="challenge-meta">
                  <div className="meta-item">
                    <span className="meta-label">CATEGORY:</span>
                    <span className="meta-value">{selectedChallenge.category}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">POINTS:</span>
                    <span className="meta-value" style={{ color: getDifficultyColor(selectedChallenge.points) }}>
                      {selectedChallenge.points}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">SOLVES:</span>
                    <span className="meta-value">{selectedChallenge.solves || 0}</span>
                  </div>
                </div>

                <div className="challenge-details">
                  <h3 className="details-title">MISSION BRIEFING</h3>
                  <p className="challenge-description">{selectedChallenge.description}</p>
                  
                  {selectedChallenge.file && (
                    <a 
                      href={selectedChallenge.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="download-btn"
                    >
                      <span>▸</span> DOWNLOAD FILE
                    </a>
                  )}
                </div>

                <form onSubmit={handleSubmitFlag} className="flag-form">
                  <div className="form-group">
                    <label className="form-label">SUBMIT FLAG:</label>
                    <div className="terminal-input-wrapper">
                      <span className="terminal-prefix">root@ctf:~$</span>
                      <input
                        type="text"
                        value={flag}
                        onChange={(e) => setFlag(e.target.value)}
                        placeholder="CTF{...}"
                        className="terminal-input"
                        disabled={isSubmitting || user?.solvedChallenges?.includes(selectedChallenge._id)}
                      />
                    </div>
                  </div>

                  {submitMessage && (
                    <motion.div
                      className={`submit-message ${submitMessage.type}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {submitMessage.text}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={isSubmitting || user?.solvedChallenges?.includes(selectedChallenge._id)}
                  >
                    {isSubmitting ? 'PROCESSING...' : 'SUBMIT FLAG'}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CyberChallenges
