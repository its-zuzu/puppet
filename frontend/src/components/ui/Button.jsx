import { motion } from 'framer-motion';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {

    const variants = {
        primary: {
            background: 'var(--neon-blue)',
            color: 'var(--cyber-black)',
            border: 'none',
        },
        secondary: {
            background: 'transparent',
            color: 'var(--neon-blue)',
            border: '1px solid var(--neon-blue)',
        },
        danger: {
            background: 'var(--neon-pink)',
            color: '#fff',
            border: 'none',
        },
        glow: {
            background: 'transparent',
            color: 'var(--neon-green)',
            border: '1px solid var(--neon-green)',
            boxShadow: 'var(--glow-sm)'
        }
    };

    const style = variants[variant] || variants.primary;

    return (
        <motion.button
            className={`
                px-6 py-2 rounded-lg font-bold uppercase tracking-wider
                flex items-center justify-center gap-2
                transition-all duration-300
                font-heading
                ${className}
            `}
            style={{ ...style, clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)' }}
            whileHover={{
                scale: 1.05,
                filter: 'brightness(1.2)',
                boxShadow: variant === 'primary' ? 'var(--glow-md)' : 'none'
            }}
            whileTap={{ scale: 0.95 }}
            {...props}
        >
            {children}
        </motion.button>
    );
};

export default Button;
