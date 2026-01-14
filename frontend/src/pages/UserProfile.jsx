import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FaUserCircle, FaTrophy, FaCheckDouble, FaKey, FaShieldAlt, FaArrowLeft } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import Card from '../components/ui/Card';
import Loading from '../components/Loading';

function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return navigate('/login');
    fetchUserProfile();
  }, [userId, isAuthenticated, navigate]);

  const fetchUserProfile = async () => {
    try {
      const [userRes, challengesRes] = await Promise.all([
        axios.get(`/api/auth/user/${userId}`),
        axios.get('/api/challenges')
      ]);
      setUser(userRes.data.user);
      setChallenges(challengesRes.data.data || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch user profile');
      setLoading(false);
    }
  };

  const getSolvedChallenges = () => {
    if (!user?.solvedChallenges || !challenges.length) return [];
    return challenges.filter(challenge => user.solvedChallenges.includes(challenge._id));
  };

  if (loading) return <Loading size="large" text="Accessing User Dossier..." />;
  if (error || !user) return <div className="text-center p-20 text-red-500">{error || 'Operative not found'}</div>;

  const solvedChallenges = getSolvedChallenges();

  return (
    <div className="min-h-screen pt-8 pb-20 px-4 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
        <button onClick={() => navigate('/scoreboard')} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--neon-blue)] transition-colors">
          <FaArrowLeft /> Back to Scoreboard
        </button>
      </motion.div>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Card className="p-8 flex flex-col md:flex-row items-center gap-6 border-t-2 border-t-[var(--neon-blue)]">
          <div className="bg-[rgba(0,0,0,0.3)] p-4 rounded-full border border-[rgba(255,255,255,0.1)]">
            <FaUserCircle className="text-6xl text-[var(--text-secondary)]" />
          </div>
          <div className="text-center md:text-left flex-grow">
            <h1 className="text-4xl font-heading font-bold text-white mb-2">{user.username}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-sm font-mono border border-blue-500/30 flex items-center gap-2">
                <FaShieldAlt /> {user.role === 'admin' ? 'SYSTEM ADMIN' : 'OPERATIVE'}
              </span>
              {user.team?.name && (
                <span className="bg-purple-900/30 text-purple-300 px-3 py-1 rounded-full text-sm font-mono border border-purple-500/30">
                  Team: {user.team.name}
                </span>
              )}
            </div>
          </div>
          {/* Points Large Display */}
          <div className="text-center px-8 border-l border-[rgba(255,255,255,0.1)] hidden md:block">
            <span className="block text-4xl font-mono font-bold text-[var(--neon-green)]">{user.points || 0}</span>
            <span className="text-xs uppercase tracking-widest text-[var(--text-dim)]">Total Score</span>
          </div>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Challenges', value: user.solvedChallenges?.length || 0, icon: <FaCheckDouble />, color: 'text-[var(--neon-blue)]' },
          { label: 'Hints Used', value: user.unlockedHints?.length || 0, icon: <FaKey />, color: 'text-[var(--neon-pink)]' },
          { label: 'Rank', value: 'N/A', icon: <FaTrophy />, color: 'text-yellow-400' }, // Would require more data for actual rank
          { label: 'Status', value: 'Active', icon: <FaShieldAlt />, color: 'text-[var(--neon-green)]' },
        ].map((stat, i) => (
          <Card key={i} className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[var(--text-dim)] text-xs uppercase tracking-wider mb-1">{stat.label}</div>
              <div className="text-2xl font-bold font-mono text-white">{stat.value}</div>
            </div>
            <div className={`text-2xl ${stat.color} opacity-80`}>{stat.icon}</div>
          </Card>
        ))}
      </div>

      {/* Solved Challenges List */}
      <h2 className="text-2xl font-bold font-heading mb-6 flex items-center gap-2">
        <span className="text-[var(--neon-green)]">///</span> Breach History
      </h2>

      {solvedChallenges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {solvedChallenges.map((challenge, i) => (
            <motion.div
              key={challenge._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-4 hover:border-[var(--neon-blue)] transition-colors group cursor-default">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg group-hover:text-[var(--neon-blue)] transition-colors">{challenge.title}</h3>
                  <span className="font-mono text-[var(--neon-green)] font-bold">{challenge.points} PTS</span>
                </div>
                <div className="flex gap-2">
                  <span className="bg-[rgba(255,255,255,0.05)] text-[var(--text-dim)] px-2 py-0.5 rounded text-xs font-mono uppercase">
                    {challenge.category}
                  </span>
                  <span className="bg-[rgba(255,255,255,0.05)] text-[var(--text-dim)] px-2 py-0.5 rounded text-xs font-mono uppercase">
                    {challenge.difficulty}
                  </span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center p-12 border border-dashed border-[rgba(255,255,255,0.1)] rounded-xl bg-[rgba(0,0,0,0.2)]">
          <p className="text-[var(--text-secondary)]">No successful breaches recorded in the database.</p>
        </div>
      )}
    </div>
  );
}

export default UserProfile;