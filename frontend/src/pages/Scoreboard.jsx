import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FaTrophy, FaUser, FaUsers, FaChartLine } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import ScoreGraph from '../components/ScoreGraph';
import Loading from '../components/Loading';
import CustomMessageDisplay from '../components/CustomMessageDisplay';
import Card from '../components/ui/Card';
import { useEventState } from '../hooks/useEventState';

function Scoreboard() {
  const { eventState: ctfEventState, customMessage } = useEventState();
  const { isAuthenticated } = useContext(AuthContext);
  const [viewType, setViewType] = useState('teams'); // 'teams' or 'users'
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  if (customMessage) return <CustomMessageDisplay message={customMessage} />;

  useEffect(() => {
    fetchScoreboard();
    const interval = setInterval(fetchScoreboard, 30000);
    return () => clearInterval(interval);
  }, [viewType, isAuthenticated]);

  const fetchScoreboard = async () => {
    try {
      const res = await axios.get(`/api/v1/scoreboard?type=${viewType}`);
      if (res.data.success) {
        setStandings(res.data.data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Scoreboard load error:', err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-8 pb-20 px-4 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl font-heading font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-[var(--neon-blue)] to-[var(--neon-green)] uppercase tracking-widest">
          Live Intelligence Ranking
        </h1>

        {/* View Switcher */}
        <div className="inline-flex bg-[rgba(0,0,0,0.3)] p-1 rounded-lg border border-[rgba(255,255,255,0.1)]">
          <button
            onClick={() => setViewType('teams')}
            className={`
                flex items-center gap-2 px-6 py-2 rounded-md font-bold text-sm tracking-wider transition-all
                ${viewType === 'teams'
                ? 'bg-[var(--neon-blue)] text-black shadow-[0_0_15px_rgba(0,243,255,0.4)]'
                : 'text-[var(--text-secondary)] hover:text-white'}
              `}
          >
            <FaUsers /> SQUADS
          </button>
          <button
            onClick={() => setViewType('users')}
            className={`
                flex items-center gap-2 px-6 py-2 rounded-md font-bold text-sm tracking-wider transition-all
                ${viewType === 'users'
                ? 'bg-[var(--neon-green)] text-black shadow-[0_0_15px_rgba(0,255,157,0.4)]'
                : 'text-[var(--text-secondary)] hover:text-white'}
              `}
          >
            <FaUser /> OPERATIVES
          </button>
        </div>
      </motion.div>

      {/* Graph Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <Card className="p-6 border border-[var(--neon-purple)]/30 shadow-[0_0_30px_rgba(139,92,246,0.1)]">
          <div className="flex items-center gap-2 mb-4 text-[var(--neon-purple)] font-bold">
            <FaChartLine /> <span>TOP 10 TREND ANALYSIS</span>
          </div>
          <div className="h-[400px] w-full">
            <ScoreGraph key={viewType} type={viewType} limit={10} />
          </div>
        </Card>
      </motion.div>

      {/* Table Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="overflow-hidden p-0 border border-[rgba(255,255,255,0.1)]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.02)] text-[var(--text-secondary)] uppercase text-xs tracking-wider border-b border-[rgba(255,255,255,0.05)]">
                <th className="p-4 text-center w-24">Rank</th>
                <th className="p-4">{viewType === 'teams' ? 'Squad Name' : 'Operative Name'}</th>
                <th className="p-4 text-right w-32">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.02)]">
              {loading ? (
                <tr><td colSpan="3" className="p-8 text-center text-[var(--text-dim)]">Decrypting live data stream...</td></tr>
              ) : standings.length === 0 ? (
                <tr><td colSpan="3" className="p-8 text-center text-[var(--text-dim)]">No visible data signatures detected.</td></tr>
              ) : (
                standings.map((entry, idx) => (
                  <tr
                    key={entry.account_id}
                    className={`
                                    hover:bg-[rgba(255,255,255,0.02)] transition-colors
                                    ${idx < 3 ? 'bg-[rgba(0,255,157,0.03)]' : ''}
                                `}
                  >
                    <td className="p-4 text-center">
                      {idx === 0 ? <FaTrophy className="mx-auto text-yellow-400 text-xl" /> :
                        idx === 1 ? <FaTrophy className="mx-auto text-gray-300 text-lg" /> :
                          idx === 2 ? <FaTrophy className="mx-auto text-amber-700 text-lg" /> :
                            <span className="font-mono text-[var(--text-secondary)]">#{entry.pos}</span>
                      }
                    </td>
                    <td className="p-4">
                      <a href={entry.account_url} className="text-[var(--text-primary)] hover:text-[var(--neon-green)] font-bold transition-colors">
                        {entry.name}
                      </a>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-[var(--neon-blue)]">
                      {entry.score}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </motion.div>
    </div>
  );
}

export default Scoreboard;
