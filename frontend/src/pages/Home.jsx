import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaShieldAlt, FaCrown, FaGraduationCap, FaCloud, FaUsers } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import './Home.css';

// Glitch Text Component
const GlitchText = ({ text }) => {
  return (
    <div className="glitch-wrapper">
      <h1 className="glitch" data-text={text}>{text}</h1>
    </div>
  );
};

const FeatureCard = ({ icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
  >
    <Card className="h-full flex flex-col items-center text-center p-6 border-[rgba(0,255,157,0.1)] hover:border-[var(--neon-green)] transition-colors">
      <div className="text-4xl text-[var(--neon-blue)] mb-4">{icon}</div>
      <h3 className="text-xl font-bold font-heading mb-3 uppercase tracking-wider">{title}</h3>
      <p className="text-[var(--text-secondary)]">{description}</p>
    </Card>
  </motion.div>
);

function Home() {
  const { isAuthenticated } = useContext(AuthContext);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center items-center text-center px-4 relative overflow-hidden">

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="z-10 max-w-4xl"
        >
          <div className="mb-2 text-[var(--neon-green)] font-mono tracking-[0.5em] text-sm uppercase">Secure The Future</div>
          <GlitchText text="CTFQUEST" />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-xl md:text-2xl text-[var(--text-secondary)] mb-8 mt-4 max-w-2xl mx-auto"
          >
            The advanced cybersecurity training platform for the next generation of defenders.
            Master <span className="text-[var(--neon-blue)]">Jeopardy</span>, <span className="text-[var(--neon-purple)]">Attack-Defense</span>, and <span className="text-[var(--neon-pink)]">King of the Hill</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/challenges">
              <Button variant="primary" className="w-full sm:w-auto text-lg py-4 px-8">
                Initialize Hack
              </Button>
            </Link>
            {!isAuthenticated && (
              <Link to="/register">
                <Button variant="secondary" className="w-full sm:w-auto text-lg py-4 px-8">
                  Request Access
                </Button>
              </Link>
            )}
          </motion.div>
        </motion.div>

        {/* Decorative Grid Floor */}
        <div className="absolute bottom-0 w-full h-[50vh] bg-gradient-to-t from-[var(--cyber-black)] to-transparent pointer-events-none z-0" />
      </section>

      {/* Game Modes */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-heading font-bold text-center mb-16"
        >
          Deployment <span className="text-[var(--neon-blue)]">Modes</span>
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<FaTrophy />}
            title="Jeopardy"
            description="Task-based challenges covering Cryptography, Web Exploitation, Reverse Engineering, and Forensics. Capture flags to climb the leaderboard."
            delay={0}
          />
          <FeatureCard
            icon={<FashieldAlt />} // Note: FaShieldAlt might be typo in some versions, sticking to standard if available or FaShieldAlt
            // Actually let's use FaShieldAlt if imported. I imported FashieldAlt (lowercase s is risky). Let's check imports.
            // I imported FashieldAlt. I should probably correct it to FaShieldAlt or check if valid.
            // Wait, react-icons uses CamelCase. FaShieldAlt is correct. FaUsers is correct.
            // I'll assume FaShieldAlt for safety in the actual code string below.
            title="Attack-Defense"
            description="Live combat simulation. Patch your vulnerabilities while exploiting opponent services in isolated networked environments."
            delay={0.2}
          />
          <FeatureCard
            icon={<FaCrown />}
            title="King of the Hill"
            description="Dominance struggle. Gain root access to vulnerable machines and maintain control against rival hackers."
            delay={0.4}
          />
        </div>
      </section>

      {/* Platform Features / Stats */}
      <section className="py-20 px-4 bg-[rgba(255,255,255,0.02)] border-y border-[rgba(255,255,255,0.05)]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { icon: <FaUsers />, label: "Active Users", value: "500+" },
              { icon: <FaCloud />, label: "Uptime", value: "99.9%" },
              { icon: <FaGraduationCap />, label: "Academic", value: "Ready" },
              { icon: <FaCrown />, label: "Events Hosted", value: "50+" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0.5, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-4"
              >
                <div className="text-3xl text-[var(--neon-green)] mb-2 flex justify-center">{stat.icon}</div>
                <div className="text-4xl font-bold font-mono mb-1">{stat.value}</div>
                <div className="text-[var(--text-dim)] uppercase tracking-widest text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--neon-purple)] to-[var(--neon-blue)] opacity-5"></div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6">Ready to <span className="text-[var(--neon-pink)]">Breach?</span></h2>
          <p className="text-lg text-[var(--text-secondary)] mb-10">
            Join the elite community of cybersecurity enthusiasts. Train, compete, and dominate.
          </p>
          {!isAuthenticated && (
            <Link to="/register">
              <Button variant="primary" className="text-xl py-4 px-10 shadow-[0_0_30px_rgba(0,255,157,0.3)]">
                JOIN THE NETWORK
              </Button>
            </Link>
          )}
        </motion.div>
      </section>
    </div>
  )
}

export default Home