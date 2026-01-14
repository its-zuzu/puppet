import { Link } from 'react-router-dom'
import { useContext } from 'react'
import AuthContext from '../context/AuthContext'
import './Home.css'

function Home() {
  const { isAuthenticated, user } = useContext(AuthContext);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="glitch-container">
            <h1 className="glitch-text">CTF<span>Quest</span></h1>
          </div>
          <p className="hero-subtitle">A Comprehensive CTF Platform for Cybersecurity Education</p>
          <p className="hero-description">
            Empowering college students and organizations with accessible, scalable platforms to practice 
            and host cybersecurity CTF events covering Jeopardy, Attack-Defense, and King of the Hill styles.
          </p>
          <div className="cta-buttons">
            <Link to="/challenges" className="cta-button primary">Explore Challenges</Link>
            {!isAuthenticated && (
              <Link to="/Login" className="cta-button secondary">Join Now</Link>
            )}
          </div>
        </div>

      </div>

      {/* CTF Styles Section */}
      <div className="features-section">
        <h2 className="section-title">CTF Competition Styles</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🏆</div>
            <h3>Jeopardy Style</h3>
            <p>Task-based challenges with flags covering cryptography, web exploits, forensics, and more</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚔️</div>
            <h3>Attack-Defense</h3>
            <p>Teams attack and defend virtual machines in isolated environments with real-time competition</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👑</div>
            <h3>King of the Hill</h3>
            <p>Compete to control servers for the longest duration in dynamic competitive environments</p>
          </div>
          {/* <div className="feature-card">
            <div className="feature-icon">🎓</div>
            <h3>Academic Integration</h3>
            <p>LMS integration with Canvas and Moodle for seamless classroom use and grade tracking</p>
            <Link to="/about" className="feature-link">Learn More →</Link>
          </div> */}
        </div>
      </div>

      {/* Platform Features Section */}
      <div className="learning-path-section">
        <div className="learning-content">
          <h2 className="section-title">Platform Features</h2>
          <p className="section-description">
            CTFQuest provides a comprehensive MERN stack-based Platform as a Service (PaaS) designed 
            specifically for cybersecurity education and competitive events.
          </p>
          <div className="path-cards">
            <div className="path-card">
              <h3>For Students</h3>
              <ul>
                <li>Hands-on cybersecurity practice</li>
                <li>Real-time scoreboards</li>
                <li>Community forums & chat</li>
                <li>Progress tracking</li>
              </ul>

            </div>
            <div className="path-card">
              <h3>For Educators</h3>
              <ul>
                <li>Custom content creation tools</li>
                <li>LMS integration (Canvas, Moodle)</li>
                <li>Grade export & analytics</li>
                <li>Event management</li>
              </ul>
              {/* <Link to="/about" className="path-button">Learn More</Link> */}
            </div>
            <div className="path-card">
              <h3>For Organizations</h3>
              <ul>
                <li>Host unlimited CTF events</li>
                <li>Scalable cloud deployment</li>
                <li>Custom branding options</li>
                <li>Advanced analytics</li>
              </ul>

            </div>
          </div>
        </div>
      </div>

      {/* Community Section */}
      <div className="community-section">
        <h2 className="section-title">Why Choose CTFQuest?</h2>
        <p className="section-description">
          The only platform that combines all three CTF styles with deep academic integration 
          and community-oriented features for comprehensive cybersecurity education.
        </p>
        <div className="community-features">
          <div className="community-feature">
            <div className="feature-icon">🌐</div>
            <h3>All-in-One Platform</h3>
            <p>Jeopardy, Attack-Defense, and King of the Hill in one place</p>
          </div>
          <div className="community-feature">
            <div className="feature-icon">🎓</div>
            <h3>Academic Focus</h3>
            <p>Built specifically for educational institutions and students</p>
          </div>
          <div className="community-feature">
            <div className="feature-icon">☁️</div>
            <h3>Cloud-Native</h3>
            <p>Scalable, secure, and accessible from anywhere</p>
          </div>
          <div className="community-feature">
            <div className="feature-icon">💰</div>
            <h3>Affordable Pricing</h3>
            <p>Free tier for students, competitive pricing for institutions</p>
          </div>
        </div>
        {!isAuthenticated && (
          <Link to="/Login" className="cta-button primary">Start Your Journey</Link>
        )}
      </div>
    </div>
  )
}

export default Home