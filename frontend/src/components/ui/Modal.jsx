import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import { createPortal } from 'react-dom';

const Modal = ({ isOpen, onClose, title, children, className = '' }) => {
    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`
                            relative w-full max-w-lg bg-[var(--cyber-dark)] 
                            border border-[var(--neon-blue)] rounded-xl 
                            shadow-[0_0_50px_rgba(0,0,0,0.5)] 
                            overflow-hidden
                            ${className}
                        `}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
                            <h3 className="text-xl font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider">
                                {title}
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-[var(--text-secondary)] hover:text-[var(--neon-pink)] transition-colors text-xl"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default Modal;
