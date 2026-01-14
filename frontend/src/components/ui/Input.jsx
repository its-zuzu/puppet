import { motion } from 'framer-motion';

const Input = ({ label, icon, error, ...props }) => {
    return (
        <div className="mb-4">
            {label && (
                <label className="block text-sm font-bold mb-2 uppercase tracking-wide text-[var(--neon-blue)]">
                    {label}
                </label>
            )}
            <div className="relative group">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--neon-green)] transition-colors">
                        {icon}
                    </div>
                )}
                <motion.input
                    className={`
                        w-full bg-[rgba(10,14,23,0.6)] 
                        border border-[rgba(255,255,255,0.1)] 
                        rounded-lg py-3 px-4 
                        ${icon ? 'pl-10' : ''}
                        text-[var(--text-primary)] 
                        placeholder-[var(--text-dim)]
                        focus:outline-none focus:border-[var(--neon-blue)]
                        transition-all duration-300
                    `}
                    whileFocus={{
                        boxShadow: '0 0 15px rgba(0, 243, 255, 0.2)',
                        scale: 1.01
                    }}
                    {...props}
                />
            </div>
            {error && (
                <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[var(--neon-pink)] text-sm mt-1 font-bold"
                >
                    {error}
                </motion.p>
            )}
        </div>
    );
};

export default Input;
