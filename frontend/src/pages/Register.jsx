import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUserPlus, FaEnvelope } from 'react-icons/fa';
import Card from '../components/ui/Card';

function Register() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-100px)] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-heading font-bold mb-2">
              REQUEST <span className="text-[var(--neon-blue)]">ACCESS</span>
            </h2>
            <p className="text-[var(--text-secondary)]">Join the CTFQuest network</p>
          </div>

          <div className="space-y-6">
            <div className="bg-[rgba(10,14,23,0.6)] border border-[rgba(255,255,255,0.1)] rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-[var(--neon-green)] flex items-center gap-2">
                <FaUserPlus /> ACQUISITION PROTOCOL
              </h3>

              <p className="text-[var(--text-secondary)] mb-4">
                New user registration is currently restricted to administrative approval.
                Please contact the system administrator to request credentials.
              </p>

              <div className="border-t border-[rgba(255,255,255,0.1)] pt-4 mt-4">
                <h4 className="font-bold mb-2 text-white">Required parameters:</h4>
                <ul className="list-disc list-inside text-[var(--text-dim)] space-y-1 ml-2">
                  <li>Full Name</li>
                  <li>Desired Username</li>
                  <li>Email Address</li>
                  <li>Team Affiliation (if any)</li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <a
                href="mailto:ctfquest@gmail.com"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[rgba(255,255,255,0.05)] border border-[var(--neon-blue)] rounded-lg text-[var(--neon-blue)] hover:bg-[var(--neon-blue)] hover:text-black transition-all duration-300 font-bold uppercase tracking-wider group"
              >
                <FaEnvelope className="group-hover:animate-bounce" />
                Contact Administrator
              </a>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-[var(--text-secondary)]">
            <p>
              Already have credentials?{' '}
              <Link to="/login" className="text-[var(--neon-green)] hover:text-[var(--neon-blue)] transition-colors">
                Login Here
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default Register;