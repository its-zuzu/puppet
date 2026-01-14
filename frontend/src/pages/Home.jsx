import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Trophy, Target, Shield, Zap, Users, Award, 
  TrendingUp, ChevronRight, Code, Lock, Search 
} from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { Button } from '../components/ui';
import { Card, CardBody } from '../components/ui';
import './Home.css';

function Home() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ challenges: 0, users: 0, solves: 0 });

  useEffect(() => {
    // Set dynamic stats if available from user context
    if (user) {
      setStats({
        challenges: user.solvedChallenges?.length || 0,
        users: user.points || 0,
        solves: user.solvedChallenges?.length || 0
      });
    }
  }, [user]);

  const features = [
    {
      icon: <Code className="feature-icon" />,
      title: "Web Exploitation",
      description: "Master XSS, SQL injection, CSRF, and advanced web vulnerabilities",
      color: "primary"
    },
    {
      icon: <Lock className="feature-icon" />,
      title: "Cryptography",
      description: "Break ciphers, analyze encryption, and understand cryptographic protocols",
      color: "success"
    },
    {
      icon: <Search className="feature-icon" />,
      title: "Forensics",
      description: "Investigate digital artifacts, analyze memory dumps, and recover hidden data",
      color: "warning"
    },
    {
      icon: <Shield className="feature-icon" />,
      title: "Binary Exploitation",
      description: "Buffer overflows, ROP chains, and reverse engineering challenges",
      color: "danger"
    }
  ];

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
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <motion.div 
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div 
            className="hero-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Shield size={16} />
            <span>Professional CTF Platform</span>
          </motion.div>

          <h1 className="hero-title">
            Master <span className="gradient-text">Cybersecurity</span>
            <br />
            Through Competition
          </h1>

          <p className="hero-description">
            Join thousands of hackers worldwide in solving real-world security challenges. 
            Practice your skills, compete on leaderboards, and level up your expertise.
          </p>

          <div className="hero-actions">
            <Button 
              variant="primary" 
              size="lg"
              icon={<Target size={20} />}
              onClick={() => navigate('/challenges')}
            >
              Explore Challenges
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              icon={<Trophy size={20} />}
              onClick={() => navigate('/scoreboard')}
            >
              View Leaderboard
            </Button>
          </div>

          {isAuthenticated && user && (
            <motion.div 
              className="user-quick-stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="quick-stat">
                <Trophy size={18} />
                <div>
                  <span className="stat-value">{user.points || 0}</span>
                  <span className="stat-label">Points</span>
                </div>
              </div>
              <div className="quick-stat">
                <Award size={18} />
                <div>
                  <span className="stat-value">{user.solvedChallenges?.length || 0}</span>
                  <span className="stat-label">Solves</span>
                </div>
              </div>
              <div className="quick-stat">
                <TrendingUp size={18} />
                <div>
                  <span className="stat-value">#{user.rank || '—'}</span>
                  <span className="stat-label">Rank</span>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        <div className="hero-decoration">
          <div className="grid-overlay"></div>
          <div className="glow-orb glow-orb-1"></div>
          <div className="glow-orb glow-orb-2"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <motion.div 
          className="section-header"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="section-title">Challenge Categories</h2>
          <p className="section-subtitle">
            Sharpen your skills across multiple cybersecurity domains
          </p>
        </motion.div>

        <motion.div 
          className="features-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className={`feature-card feature-card--${feature.color}`} hover>
                <CardBody>
                  <div className={`feature-icon-wrapper feature-icon--${feature.color}`}>
                    {feature.icon}
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <Card className="cta-card" glow>
          <CardBody>
            <motion.div 
              className="cta-content"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <div className="cta-text">
                <h2 className="cta-title">Ready to Start Hacking?</h2>
                <p className="cta-description">
                  {isAuthenticated 
                    ? "Your next challenge awaits. Continue your journey to the top."
                    : "Join our community and start solving challenges today."}
                </p>
              </div>
              <div className="cta-actions">
                {isAuthenticated ? (
                  <Button 
                    variant="primary" 
                    size="lg"
                    icon={<ChevronRight size={20} />}
                    onClick={() => navigate('/challenges')}
                  >
                    Continue Learning
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="primary" 
                      size="lg"
                      onClick={() => navigate('/register')}
                    >
                      Get Started
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="lg"
                      onClick={() => navigate('/login')}
                    >
                      Sign In
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </CardBody>
        </Card>
      </section>

      {/* Platform Stats Section */}
      <section className="stats-section">
        <motion.div 
          className="stats-container"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div className="stat-item" variants={itemVariants}>
            <Zap className="stat-icon" />
            <div className="stat-content">
              <span className="stat-number">100+</span>
              <span className="stat-label">Challenges</span>
            </div>
          </motion.div>
          <motion.div className="stat-item" variants={itemVariants}>
            <Users className="stat-icon" />
            <div className="stat-content">
              <span className="stat-number">1K+</span>
              <span className="stat-label">Active Users</span>
            </div>
          </motion.div>
          <motion.div className="stat-item" variants={itemVariants}>
            <Trophy className="stat-icon" />
            <div className="stat-content">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Flags Captured</span>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}

export default Home;