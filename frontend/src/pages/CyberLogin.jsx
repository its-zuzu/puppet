import { useState, useContext, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthContext from '../context/AuthContext'
import { motion } from 'framer-motion'
import { sanitizeInput, validateEmail } from '../utils/security'
import './CyberLogin.css'

function CyberLogin() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [typedText, setTypedText] = useState('')

  const { login, clearErrors } = useContext(AuthContext)
  const navigate = useNavigate()

  const welcomeText = '> INITIALIZING SECURE CONNECTION...'

  useEffect(() => {
    let index = 0
    const timer = setInterval(() => {
      if (index < welcomeText.length) {
        setTypedText(welcomeText.slice(0, index + 1))
        index++
      } else {
        clearInterval(timer)
      }
    }, 50)
    return () => clearInterval(timer)
  }, [])

  const onChange = (e) => {
    const sanitizedValue = sanitizeInput(e.target.value)
    setFormData({ ...formData, [e.target.name]: sanitizedValue })
    setFormError('')
    setIsBlocked(false)
    clearErrors()
  }

  const onSubmit = async (e) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      setFormError('> ERROR: ALL FIELDS REQUIRED')
      return
    }

    if (!validateEmail(formData.email)) {
      setFormError('> ERROR: INVALID EMAIL FORMAT')
      return
    }

    setIsSubmitting(true)

    try {
      await login(formData)
      navigate('/')
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'ACCESS DENIED'
      setFormError(`> ERROR: ${errorMessage.toUpperCase()}`)
      
      if (err.response?.status === 403 && err.response?.data?.isBlocked) {
        setIsBlocked(true)
      }
      
      setIsSubmitting(false)
    }
  }

  return (
    <div className="cyber-login-container">
      <motion.div
        className="cyber-login-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="login-header">
          <motion.div
            className="terminal-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {typedText}
            <span className="terminal-cursor"></span>
          </motion.div>
          <h2 className="login-title">
            <span className="bracket">{'['}</span>
            AUTHENTICATION
            <span className="bracket">{']'}</span>
          </h2>
          <p className="login-subtitle">Enter credentials to access CTF platform</p>
        </div>

        {formError && (
          <motion.div
            className={`cyber-error ${isBlocked ? 'blocked' : ''}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="error-icon">⚠</span>
            {formError}
          </motion.div>
        )}

        <form onSubmit={onSubmit} className="cyber-login-form">
          <div className="form-group">
            <label className="cyber-label">
              <span className="label-icon">▸</span> EMAIL ADDRESS
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              className="cyber-input"
              placeholder="user@ctfquest.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="cyber-label">
              <span className="label-icon">▸</span> PASSWORD
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={onChange}
              className="cyber-input"
              placeholder="••••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <motion.button
            type="submit"
            className="cyber-submit-btn"
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isSubmitting ? (
              <>
                <span className="btn-spinner"></span>
                AUTHENTICATING...
              </>
            ) : (
              <>
                <span className="btn-icon">▸</span>
                INITIATE LOGIN SEQUENCE
              </>
            )}
          </motion.button>
        </form>

        <div className="login-footer">
          <p className="footer-text">
            <span className="footer-icon">◆</span>
            New to CTFQuest?{' '}
            <Link to="/register" className="cyber-link">
              Register here
            </Link>
          </p>
          <p className="footer-note">
            Secure connection established via TLS 1.3
          </p>
        </div>
      </motion.div>

      {/* Floating particles effect */}
      <div className="particles-container">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default CyberLogin
