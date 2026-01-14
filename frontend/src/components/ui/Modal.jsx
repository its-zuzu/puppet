import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalVariants, backdropVariants } from '../../utils/animations';
import './Modal.css';

/**
 * Modal Component
 * Animated modal with backdrop blur
 */
const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    closeOnBackdropClick = true,
    showCloseButton = true,
    className = '',
}) => {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    const handleBackdropClick = (e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="modal-container">
                    {/* Backdrop */}
                    <motion.div
                        className="modal-backdrop"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={handleBackdropClick}
                    />

                    {/* Modal */}
                    <div className="modal-wrapper" onClick={handleBackdropClick}>
                        <motion.div
                            className={`modal modal-${size} ${className}`}
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            {(title || showCloseButton) && (
                                <div className="modal-header">
                                    {title && <h2 className="modal-title">{title}</h2>}
                                    {showCloseButton && (
                                        <button
                                            className="modal-close"
                                            onClick={onClose}
                                            aria-label="Close modal"
                                        >
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Body */}
                            <div className="modal-body">{children}</div>

                            {/* Footer */}
                            {footer && <div className="modal-footer">{footer}</div>}
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default Modal;
