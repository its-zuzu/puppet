import React from 'react';
import { motion } from 'framer-motion';
import './Button.css';

/**
 * Professional Button Component
 * Variants: primary, secondary, danger, ghost, outline
 * Sizes: sm, md, lg
 */
const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon = null,
    iconPosition = 'left',
    fullWidth = false,
    onClick,
    type = 'button',
    className = '',
    ...props
}) => {
    const buttonClass = `
    btn
    btn-${variant}
    btn-${size}
    ${fullWidth ? 'btn-full-width' : ''}
    ${loading ? 'btn-loading' : ''}
    ${disabled ? 'btn-disabled' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

    return (
        <motion.button
            className={buttonClass}
            onClick={onClick}
            disabled={disabled || loading}
            type={type}
            whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
            whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
            transition={{ duration: 0.15 }}
            {...props}
        >
            {loading && (
                <span className="btn-spinner">
                    <svg className="spinner-icon" viewBox="0 0 24 24">
                        <circle
                            className="spinner-circle"
                            cx="12"
                            cy="12"
                            r="10"
                            fill="none"
                            strokeWidth="3"
                        />
                    </svg>
                </span>
            )}

            {!loading && icon && iconPosition === 'left' && (
                <span className="btn-icon btn-icon-left">{icon}</span>
            )}

            <span className="btn-text">{children}</span>

            {!loading && icon && iconPosition === 'right' && (
                <span className="btn-icon btn-icon-right">{icon}</span>
            )}
        </motion.button>
    );
};

export default Button;
