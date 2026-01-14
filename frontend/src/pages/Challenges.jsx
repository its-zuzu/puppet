import { useState, useEffect, useContext, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { FaTrophy, FaCheckCircle, FaLock, FaGlobe, FaSearch, FaMicrochip, FaTerminal } from 'react-icons/fa'
import AuthContext from '../context/AuthContext'
import Logger from '../utils/logger'
import { useEventState } from '../hooks/useEventState'
import Loading from '../components/Loading'
import CustomMessageDisplay from '../components/CustomMessageDisplay'
import CTFEndedDisplay from '../components/CTFEndedDisplay'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'

// --- Internal Sub-components ---

const SolvesModal = ({ challenge, onClose }) => {
  const [solves, setSolves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSolves = async () => {
      try {
        const res = await axios.get(`/api/challenges/${challenge._id}/solves`);
        setSolves(res.data.data || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching solves:', err);
        setLoading(false);
      }
    };
    fetchSolves();
  }, [challenge._id]);

  return (
    <Modal isOpen={true} onClose={onClose} title={`Solves: ${challenge.title}`}>
      {loading ? (
        <Loading size="small" inline text="Loading data..." />
      ) : solves.length === 0 ? (
        <p className="text-center text-[var(--text-secondary)] py-8">No hackers have cracked this yet.</p>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.1)] text-[var(--neon-blue)] text-sm uppercase">
              <th className="p-3">#</th>
              <th className="p-3">Hacker</th>
              <th className="p-3">Team</th>
              <th className="p-3">Time</th>
            </tr>
          </thead>
          <tbody className="text-[var(--text-primary)]">
            {solves.map((solve, index) => (
              <tr key={index} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)]">
                <td className="p-3 font-mono text-[var(--text-dim)]">{index + 1}</td>
                <td className="p-3 font-bold">{solve.username}</td>
                <td className="p-3 text-[var(--text-secondary)]">{solve.team || '-'}</td>
                <td className="p-3 text-sm font-mono text-[var(--text-dim)]">{new Date(solve.solvedAt).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
};

function Challenges() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSolvesModal, setShowSolvesModal] = useState(false)
  const [selectedChallengeForSolves, setSelectedChallengeForSolves] = useState(null)

  const { user, isAuthenticated } = useContext(AuthContext)
  const { eventState, customMessage, isEnded } = useEventState()
  const navigate = useNavigate();
  const isMounted = useRef(false);

  // Gamified Icons for categories
  const categoryIcons = {
    web: <FaGlobe />,
    crypto: <FaLock />,
    forensics: <FaSearch />,
    reverse: <FaMicrochip />,
    pwn: <FaTerminal />,
    misc: <FaTrophy />
  };

  const categories = [
    { id: 'all', name: 'ALL' },
    { id: 'web', name: 'WEB' },
    { id: 'crypto', name: 'CRYPTO' },
    { id: 'forensics', name: 'FORENSICS' },
    { id: 'reverse', name: 'REVERSE' },
    { id: 'osint', name: 'OSINT' },
    { id: 'misc', name: 'MISC' }
  ]

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchChallenges = async (showLoadingState = true) => {
    try {
      if (showLoadingState && isMounted.current) setLoading(true);
      const res = await axios.get('/api/challenges?page=1&limit=1000');

      if (!isMounted.current) return;

      if (!res.data.data || !Array.isArray(res.data.data)) {
        setChallenges([]);
      } else {
        const visibleChallenges = user?.role === 'admin'
          ? res.data.data
          : res.data.data.filter(challenge => challenge.isVisible === true);
        setChallenges(visibleChallenges);
      }

      if (showLoadingState) setLoading(false);
    } catch (err) {
      if (!isMounted.current) return;
      setError('Failed to fetch challenges.');
      if (showLoadingState) setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges(true);
    const pollInterval = setInterval(() => {
      if (isMounted.current) fetchChallenges(false);
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [user?.role, isAuthenticated]);

  const filteredChallenges = activeCategory === 'all'
    ? challenges
    : challenges.filter(challenge => challenge.category === activeCategory);

  const handleChallengeClick = (challenge) => {
    navigate(`/challenges/${challenge._id}`);
  };

  // --- Render ---

  if (customMessage) return <CustomMessageDisplay message={customMessage} />;
  if (isEnded) return <CTFEndedDisplay endedAt={eventState?.endedAt} />;

  return (
    <div className="min-h-screen pt-4 pb-20 px-4 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 relative"
      >
        <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4 uppercase tracking-wider">
          Mission <span className="text-[var(--neon-blue)]">Center</span>
        </h1>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`
                px-4 py-2 rounded-full font-bold text-sm tracking-widest transition-all duration-300 border
                ${activeCategory === category.id
                  ? 'bg-[var(--neon-green)] text-[var(--cyber-dark)] border-[var(--neon-green)] shadow-[0_0_15px_rgba(0,255,157,0.4)]'
                  : 'bg-transparent text-[var(--text-secondary)] border-[rgba(255,255,255,0.1)] hover:border-[var(--neon-blue)] hover:text-[var(--text-primary)]'
                }
              `}
            >
              {category.name}
            </button>
          ))}
        </div>

        {!isAuthenticated && (
          <p className="text-[var(--neon-pink)] font-bold bg-[rgba(255,0,85,0.1)] border border-[rgba(255,0,85,0.3)] p-4 rounded-lg inline-block">
            <FaLock className="inline mr-2" /> Authentication Required for Flag Submission
          </p>
        )}
      </motion.div>

      {/* Grid */}
      {loading ? (
        <Loading size="medium" text="Establishing encrypted connection..." />
      ) : error ? (
        <div className="text-red-500 text-center">{error}</div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {filteredChallenges.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full text-center text-[var(--text-secondary)] py-20"
              >
                No challenges detected in this sector.
              </motion.div>
            ) : (
              filteredChallenges.map(challenge => {
                const isSolved = user?.solvedChallenges?.includes(challenge._id);
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={challenge._id}
                  >
                    <Card
                      className={`h-full flex flex-col justify-between group cursor-pointer border-l-4 ${isSolved ? 'border-l-[var(--neon-green)]' : 'border-l-[var(--neon-blue)]'
                        }`}
                      onClick={() => handleChallengeClick(challenge)}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className={`
                                text-xs font-bold px-2 py-1 rounded uppercase tracking-wider
                                ${challenge.difficulty === 'Easy' ? 'bg-green-900/50 text-green-400' :
                              challenge.difficulty === 'Medium' ? 'bg-yellow-900/50 text-yellow-400' :
                                'bg-red-900/50 text-red-500'}
                              `}>
                            {challenge.difficulty || 'Easy'}
                          </span>
                          <span className="font-mono font-bold text-[var(--neon-blue)]">
                            {challenge.currentValue || challenge.points} PTS
                          </span>
                        </div>

                        <h3 className="text-xl font-heading font-bold mb-2 group-hover:text-[var(--neon-blue)] transition-colors flex items-center gap-2">
                          {challenge.title}
                          {isSolved && <FaCheckCircle className="text-[var(--neon-green)]" />}
                        </h3>

                        <div className="text-sm text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                          <span className="opacity-70">{challenge.category}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-[rgba(255,255,255,0.05)]">
                        <button
                          className="text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:underline z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedChallengeForSolves(challenge);
                            setShowSolvesModal(true);
                          }}
                        >
                          {challenge.solvedBy?.length || 0} SOLVES
                        </button>

                        <span className={`text-sm font-bold ${isSolved ? 'text-[var(--neon-green)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--neon-blue)]'}`}>
                          {isSolved ? 'COMPLETED' : 'ACCESS ->'}
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                )
              })
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {showSolvesModal && selectedChallengeForSolves && (
        <SolvesModal
          challenge={selectedChallengeForSolves}
          onClose={() => setShowSolvesModal(false)}
        />
      )}
    </div>
  )
}

export default Challenges