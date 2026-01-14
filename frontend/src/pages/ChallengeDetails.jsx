import { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { motion } from 'framer-motion'
import { FaArrowLeft, FaFlag, FaUnlock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'
import AuthContext from '../context/AuthContext'
import { useEventState } from '../hooks/useEventState'
import Loading from '../components/Loading'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'

// --- Sub-components ---

const FlagSubmissionModal = ({ challenge, onClose, onSubmit, isEnded }) => {
  const [flag, setFlag] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!flag.trim()) { setError('Please enter a flag'); return; }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await onSubmit(flag);
      setSuccess('SYSTEM BREACH SUCCESSFUL. POINTS AWARDED.');
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError(err.message || 'Incorrect Flag sequence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Target: ${challenge.title}`}>
      {isEnded && (
        <div className="p-4 mb-4 bg-purple-900/30 border border-purple-500 rounded text-purple-300">
          Event Concluded. Submissions Disabled.
        </div>
      )}

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 mb-4 bg-red-900/30 border border-red-500 rounded text-red-300 flex items-center gap-2">
          <FaExclamationTriangle /> {error}
        </motion.div>
      )}

      {success && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 mb-4 bg-green-900/30 border border-[var(--neon-green)] rounded text-[var(--neon-green)] flex items-center gap-2">
          <FaCheckCircle /> {success}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Flag Sequence"
          placeholder="SECE{...}"
          value={flag}
          onChange={(e) => setFlag(e.target.value)}
          disabled={isSubmitting || success || isEnded}
          autoFocus
        />
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || success || isEnded}
          className="w-full"
        >
          {isSubmitting ? 'Verifying...' : 'EXECUTE SUBMISSION'}
        </Button>
      </form>
    </Modal>
  );
};

function ChallengeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [unlockedHints, setUnlockedHints] = useState([]);
  const [unlockingHint, setUnlockingHint] = useState(null);

  const { user, isAuthenticated, updateUserData } = useContext(AuthContext);
  const { isEnded } = useEventState();

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/challenges/${id}`);
        setChallenge(res.data.data);
        setUnlockedHints(res.data.unlockedHints || []);
        setLoading(false);
      } catch (err) {
        setError('Target not found within database.');
        setLoading(false);
      }
    };
    fetchChallenge();
  }, [id]);

  const submitFlag = async (flag) => {
    if (!challenge || !isAuthenticated) throw new Error('Auth Error');
    try {
      const res = await axios.post(`/api/challenges/${challenge._id}/submit`, { flag });
      await updateUserData();
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to submit flag');
    }
  };

  const unlockHint = async (hintIndex) => {
    const hint = challenge.hints[hintIndex];
    if (window.confirm(`Decrypt hint for ${hint.cost} points?`)) {
      try {
        setUnlockingHint(hintIndex);
        await axios.post(`/api/challenges/${challenge._id}/unlock-hint`, { hintIndex });
        setUnlockedHints([...unlockedHints, hintIndex]);
        await updateUserData();
      } catch (err) {
        alert(err.response?.data?.message || 'Decryption Failed');
      } finally {
        setUnlockingHint(null);
      }
    }
  };

  if (loading) return <Loading size="large" text="Establishing Uplink..." />;
  if (error || !challenge) return <div className="text-center p-20 text-red-500">{error}</div>;

  const isSolved = user?.solvedChallenges?.includes(challenge._id);

  return (
    <div className="min-h-screen pt-4 pb-20 px-4 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
        <button onClick={() => navigate('/challenges')} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--neon-blue)] transition-colors">
          <FaArrowLeft /> Abort Mission / Return
        </button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="md:col-span-2">
          <Card className="p-8 mb-6 relative overflow-hidden">
            {isSolved && (
              <div className="absolute top-0 right-0 bg-[var(--neon-green)] text-black font-bold px-4 py-1 skew-x-[-20deg] translate-x-4">
                COMPLETED
              </div>
            )}

            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-heading font-bold mb-2">{challenge.title}</h1>
                <div className="flex gap-2">
                  <span className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-1 rounded-full text-sm font-mono text-[var(--neon-blue)]">
                    {challenge.category}
                  </span>
                  <span className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-1 rounded-full text-sm font-mono text-[var(--neon-purple)]">
                    {challenge.points} PTS
                  </span>
                  <span className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-3 py-1 rounded-full text-sm font-mono text-[var(--text-secondary)]">
                    {challenge.derivedDifficulty || challenge.difficulty || 'Normal'}
                  </span>
                </div>
              </div>
            </div>

            <div className="prose prose-invert max-w-none text-[var(--text-secondary)] font-body leading-relaxed border-t border-[rgba(255,255,255,0.05)] pt-4">
              {challenge.description.split('\n').map((line, i) => <p key={i}>{line}</p>)}
            </div>
          </Card>

          {/* Hints Section */}
          {challenge.hints && challenge.hints.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-heading font-bold text-[var(--text-primary)]">Intelligence / Hints</h3>
              {challenge.hints.map((hint, index) => {
                const isUnlocked = unlockedHints.includes(index) || hint.cost === 0;
                return (
                  <Card key={index} className="p-4 border-l-4 border-l-[var(--neon-purple)]">
                    {isUnlocked ? (
                      <div className="text-[var(--text-primary)]">
                        <span className="text-[var(--neon-purple)] font-bold text-sm uppercase mb-1 block">Decrypted Intelligence:</span>
                        {hint.content}
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-[var(--text-dim)]">
                          <FaLock />
                          <span>Encrypted Intelligence (Cost: {hint.cost} PTS)</span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => unlockHint(index)}
                          disabled={unlockingHint === index}
                        >
                          {unlockingHint === index ? 'Decrypting...' : 'Decrypt'}
                        </Button>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Actions */}
        <div className="md:col-span-1">
          <Card className="p-6 sticky top-24">
            <h3 className="text-lg font-bold mb-4 uppercase text-[var(--text-dim)]">Mission Status</h3>

            <div className="mb-6 text-center">
              {isSolved ? (
                <div className="text-[var(--neon-green)] flex flex-col items-center">
                  <FaCheckCircle className="text-5xl mb-2" />
                  <span className="font-bold text-xl">MISSION ACCOMPLISHED</span>
                </div>
              ) : (
                <div className="text-[var(--text-secondary)] flex flex-col items-center">
                  <FaFlag className="text-5xl mb-2 opacity-50" />
                  <span className="font-bold">PENDING SUBMISSION</span>
                </div>
              )}
            </div>

            {!isSolved && (
              <Button
                variant="primary"
                className="w-full py-4 text-lg shadow-[0_0_20px_rgba(0,255,157,0.2)]"
                onClick={() => isAuthenticated ? setShowModal(true) : navigate('/login')}
                disabled={isEnded}
              >
                {isAuthenticated ? 'SUBMIT FLAG' : 'LOGIN TO SUBMIT'}
              </Button>
            )}

            <div className="mt-4 text-center">
              <span className="text-sm text-[var(--text-dim)] font-mono">
                {challenge.solvedBy?.length || 0} Successful Breaches
              </span>
            </div>
          </Card>
        </div>
      </div>

      {showModal && (
        <FlagSubmissionModal
          challenge={challenge}
          onClose={() => setShowModal(false)}
          onSubmit={submitFlag}
          isEnded={isEnded}
        />
      )}
    </div>
  )
}

export default ChallengeDetails;