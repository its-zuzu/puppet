import './About.css'
import { useSiteConfig } from '../context/SiteConfigContext'

function About() {
  const { eventName } = useSiteConfig()

  return (
    <div className="about-container">
      <div className="about-header">
        <h1>About <span className="highlight">{eventName}</span></h1>
        <p className="about-subtitle">
          A Comprehensive CTF Platform for Cybersecurity Education - Bridging the gap between theory and practice 
          through innovative, scalable, and accessible cybersecurity training.
        </p>
      </div>

      <div className="about-section">
        <div className="about-card">
          <h2>Our Mission</h2>
          <p>
            {eventName}'s mission is to make cybersecurity education accessible, scalable, and practical for college students 
            and small organizations. We provide a comprehensive MERN stack-based Platform as a Service (PaaS) that supports 
            all three CTF styles: Jeopardy, Attack-Defense, and King of the Hill, with deep academic integration and 
            community-oriented features.
          </p>
        </div>

        <div className="about-card">
          <h2>The Problem We Solve</h2>
          <p>
            College students and small organizations lack accessible, scalable platforms to practice and host cybersecurity 
            CTF events. Existing solutions are either costly, lack academic integration, or support limited CTF formats, 
            hindering hands-on learning and event organization. {eventName} addresses these gaps with a unified, 
            education-focused platform.
          </p>
        </div>

        <div className="about-card">
          <h2>Our Solution</h2>
          <p>
            {eventName} offers a beginner-friendly interface, academic integration with Learning Management Systems (LMS), 
            and community features like forums and live events. The platform enables students to practice cybersecurity 
            challenges and allows universities and small organizations to host CTF events with custom content creation tools.
          </p>
        </div>
      </div>

      <div className="values-section">
        <h2>Platform Features & Advantages</h2>
        <div className="values-grid">
          <div className="value-card">
            <div className="value-icon">🌐</div>
            <h3>All-in-One CTF Support</h3>
            <p>Unlike competitors, {eventName} supports Jeopardy, Attack-Defense, and King of the Hill in one platform</p>
          </div>
          {/* <div className="value-card">
            <div className="value-icon">🎓</div>
            <h3>Academic Integration</h3>
            <p>Deep LMS integration with Canvas and Moodle for seamless classroom use and grade tracking</p>
          </div> */}
          <div className="value-card">
            <div className="value-icon">☁️</div>
            <h3>Cloud-Native Architecture</h3>
            <p>MERN stack ensures scalability, real-time features, and modern development practices</p>
          </div>
          <div className="value-card">
            <div className="value-icon">👥</div>
            <h3>Community-Oriented</h3>
            <p>Forums, live events, and collaboration features foster a global cybersecurity network</p>
          </div>
          <div className="value-card">
            <div className="value-icon">🔧</div>
            <h3>Custom Content Tools</h3>
            <p>Educators can design challenges tailored to curricula with our intuitive creation tools</p>
          </div>
          <div className="value-card">
            <div className="value-icon">💰</div>
            <h3>Affordable Pricing</h3>
            <p>Free tier for students, 50% cheaper than competitors for premium features</p>
          </div>
        </div>
      </div>

       <div className="team-section">
        <h2>Our Team</h2>
        <div className="team-grid">
          <div className="team-member">
            <div className="member-avatar">👨‍💻</div>
            <h3>Yukesh</h3>
            <p className="member-role">Role </p>
            <p className="member-bio">Content</p>
          </div>
          <div className="team-member">
            <div className="member-avatar">👩‍💻</div>
            <h3>Kaviya</h3>
            <p className="member-role">Role</p>
            <p className="member-bio">Content</p>
          </div> 
          <div className="team-member">
            <div className="member-avatar">👨‍💻</div>
            <h3>Muthu Raja</h3>
            <p className="member-role">Role</p>
            <p className="member-bio">Content</p>
          </div> 
         </div>
      </div> 

      <div className="stats-section">
        <h2>Project Goals & Impact</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">10K+</span>
            <span className="stat-label">Target Active Users</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">10</span>
            <span className="stat-label">Annual CTF Events</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">20</span>
            <span className="stat-label">Partner Universities</span>
          </div>
          {/* <div className="stat-card">
            <span className="stat-number">₹50L</span>
            <span className="stat-label">Revenue Target (Year 2)</span>
          </div> */}
          <div className="stat-card">
            <span className="stat-number">80%</span>
            <span className="stat-label">Skill Improvement Rate</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">18M</span>
            <span className="stat-label">Development Timeline</span>
          </div>
        </div>
      </div>

      {/* <div className="pricing-section">
        <h2>Pricing Advantage</h2>
        <div className="pricing-grid">
          <div className="pricing-card">
            <h3>Free Tier</h3>
            <div className="price">₹0<span>/month</span></div>
            <ul>
              <li>Basic access for students</li>
              <li>Limited challenges</li>
              <li>Community forums</li>
              <li>Basic tutorials</li>
            </ul>
          </div>
          <div className="pricing-card featured">
            <h3>Premium Tier</h3>
            <div className="price">₹500<span>/month</span></div>
            <ul>
              <li>Full CTF access</li>
              <li>LMS integration</li>
              <li>Event hosting</li>
              <li>50% cheaper than competitors</li>
            </ul>
          </div>
          <div className="pricing-card">
            <h3>Organization Plan</h3>
            <div className="price">₹10K<span>/month</span></div>
            <ul>
              <li>Unlimited events</li>
              <li>Custom branding</li>
              <li>Advanced analytics</li>
              <li>Dedicated support</li>
            </ul>
          </div>
        </div>
      </div> */}
    </div>
  )
}

export default About
