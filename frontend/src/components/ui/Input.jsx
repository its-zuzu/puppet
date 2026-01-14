import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './Input.css';

/**
 * Professional Input Component
 * Types: text, email, password, number, textarea
 * Features: floating labels, icons, error states
 */
const Input = ({
    type = 'text',
    label,
    placeholder,
    value,
    onChange,
    onBlur,
    onFocus,
    error,
    helperText,
    icon,
    iconPosition = 'left',
    disabled = false,
    required = false,
    fullWidth = false,
    rows = 4,
    className = '',
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const hasValue = value && value.length > 0;
    const isFloating = label && (isFocused || hasValue);

    const handleFocus = (e) => {
        setIsFocused(true);
        if (onFocus) onFocus(e);
    };

    const handleBlur = (e) => {
        setIsFocused(false);
        if (onBlur) onBlur(e);
    };

    const inputClass = `
    input-wrapper
    ${fullWidth ? 'input-full-width' : ''}
    ${error ? 'input-error' : ''}
    ${disabled ? 'input-disabled' : ''}
    ${isFocused ? 'input-focused' : ''}
    ${icon ? `input-with-icon-${iconPosition}` : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

    const InputElement = type === 'textarea' ? 'textarea' : 'input';
    const inputType = type === 'password' && showPassword ? 'text' : type;

    return (
        <div className={inputClass}>
            {icon && iconPosition === 'left' && (
                <span className="input-icon input-icon-left">{icon}</span>
            )}

            <div className="input-field-wrapper">
                <InputElement
                    type={inputType}
                    className="input-field"
                    value={value}
                    onChange={onChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    disabled={disabled}
                    required={required}
                    placeholder={label ? '' : placeholder}
                    rows={type === 'textarea' ? rows : undefined}
                    {...props}
                />

                {label && (
                    <motion.label
                        className={`input-label ${isFloating ? 'input-label-floating' : ''}`}
                        initial={false}
                        animate={{
                            top: isFloating ? '-0.5rem' : '50%',
                            fontSize: isFloating ? 'var(--font-size-xs)' : 'var(--font-size-base)',
                            color: error
                                ? 'var(--color-accent-tertiary)'
                                : isFocused
                                    ? 'var(--color-accent-primary)'
                                    : 'var(--color-text-tertiary)',
                        }}
                        transition={{ duration: 0.2 }}
                    >
                        {label}
                        {required && <span className="input-required">*</span>}
                    </motion.label>
                )}
            </div>

            {type === 'password' && (
                <button
                    type="button"
                    className="input-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                >
                    {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    )}
                </button>
            )}

            {icon && iconPosition === 'right' && !type.includes('password') && (
                <span className="input-icon input-icon-right">{icon}</span>
            )}

            {(error || helperText) && (
                <motion.div
                    className={`input-helper ${error ? 'input-helper-error' : ''}`}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {error || helperText}
                </motion.div>
            )}
        </div>
    );
};

export default Input;
