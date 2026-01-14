import { motion } from 'framer-motion';

const Card = ({ children, className = '', hover = true, ...props }) => {
    return (
        <motion.div
            className={`
                relative overflow-hidden
                bg-[var(--glass-bg)] 
                backdrop-blur-md 
                border border-[rgba(255,255,255,0.05)]
                rounded-xl
                shadow-lg
                ${className}
            `}
            style={{
                background: 'linear-gradient(180deg, rgba(26, 35, 50, 0.7) 0%, rgba(10, 14, 23, 0.9) 100%)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            }}
            whileHover={hover ? { scale: 1.02, borderColor: 'var(--neon-blue)', boxShadow: 'var(--glow-sm)' } : {}}
            transition={{ duration: 0.2 }}
            {...props}
        >
            {/* Cyber Corner Accents */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[var(--neon-blue)] opacity-50" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[var(--neon-blue)] opacity-50" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[var(--neon-blue)] opacity-50" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[var(--neon-blue)] opacity-50" />

            <div className="p-6 relative z-10">
                {children}
            </div>
        </motion.div>
    );
};

export default Card;
