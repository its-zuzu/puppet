/**
 * Framer Motion Animation Variants
 * Reusable animation configurations for the CTF platform
 */

// Page transition variants
export const pageVariants = {
    initial: {
        opacity: 0,
        y: 20,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1],
        },
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: {
            duration: 0.3,
            ease: [0.4, 0, 1, 1],
        },
    },
};

// Fade in animation
export const fadeInVariants = {
    hidden: {
        opacity: 0,
    },
    visible: {
        opacity: 1,
        transition: {
            duration: 0.3,
            ease: 'easeOut',
        },
    },
};

// Slide in from bottom
export const slideUpVariants = {
    hidden: {
        opacity: 0,
        y: 30,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1],
        },
    },
};

// Slide in from left
export const slideInLeftVariants = {
    hidden: {
        opacity: 0,
        x: -50,
    },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1],
        },
    },
};

// Slide in from right
export const slideInRightVariants = {
    hidden: {
        opacity: 0,
        x: 50,
    },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1],
        },
    },
};

// Scale in animation
export const scaleInVariants = {
    hidden: {
        opacity: 0,
        scale: 0.9,
    },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1],
        },
    },
};

// Stagger children animation
export const staggerContainerVariants = {
    hidden: {
        opacity: 0,
    },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        },
    },
};

// Stagger item (use with staggerContainer)
export const staggerItemVariants = {
    hidden: {
        opacity: 0,
        y: 20,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1],
        },
    },
};

// Card hover animation
export const cardHoverVariants = {
    rest: {
        scale: 1,
        y: 0,
    },
    hover: {
        scale: 1.02,
        y: -4,
        transition: {
            duration: 0.2,
            ease: 'easeOut',
        },
    },
    tap: {
        scale: 0.98,
    },
};

// Button hover/tap animation
export const buttonVariants = {
    rest: {
        scale: 1,
    },
    hover: {
        scale: 1.05,
        transition: {
            duration: 0.2,
            ease: 'easeOut',
        },
    },
    tap: {
        scale: 0.95,
    },
};

// Modal animation
export const modalVariants = {
    hidden: {
        opacity: 0,
        scale: 0.95,
        y: 20,
    },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1],
        },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 20,
        transition: {
            duration: 0.2,
            ease: [0.4, 0, 1, 1],
        },
    },
};

// Backdrop animation
export const backdropVariants = {
    hidden: {
        opacity: 0,
    },
    visible: {
        opacity: 1,
        transition: {
            duration: 0.2,
        },
    },
    exit: {
        opacity: 0,
        transition: {
            duration: 0.2,
        },
    },
};

// Navbar slide down
export const navbarVariants = {
    hidden: {
        y: -100,
        opacity: 0,
    },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1],
        },
    },
};

// Mobile menu slide
export const mobileMenuVariants = {
    closed: {
        x: '100%',
        transition: {
            duration: 0.3,
            ease: [0.4, 0, 1, 1],
        },
    },
    open: {
        x: 0,
        transition: {
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1],
        },
    },
};

// Dropdown menu
export const dropdownVariants = {
    hidden: {
        opacity: 0,
        y: -10,
        scale: 0.95,
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1],
        },
    },
    exit: {
        opacity: 0,
        y: -10,
        scale: 0.95,
        transition: {
            duration: 0.15,
            ease: [0.4, 0, 1, 1],
        },
    },
};

// Number counter animation
export const counterVariants = {
    hidden: {
        opacity: 0,
        scale: 0.5,
    },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.5,
            ease: 'easeOut',
        },
    },
};

// Glow pulse effect
export const glowPulseVariants = {
    initial: {
        boxShadow: '0 0 10px rgba(0, 255, 170, 0.3)',
    },
    animate: {
        boxShadow: [
            '0 0 10px rgba(0, 255, 170, 0.3)',
            '0 0 20px rgba(0, 255, 170, 0.6)',
            '0 0 10px rgba(0, 255, 170, 0.3)',
        ],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};

// Loading spinner
export const spinnerVariants = {
    animate: {
        rotate: 360,
        transition: {
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
        },
    },
};

// Skeleton loading shimmer
export const shimmerVariants = {
    animate: {
        backgroundPosition: ['200% 0', '-200% 0'],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
        },
    },
};

// Toast notification
export const toastVariants = {
    hidden: {
        opacity: 0,
        x: 100,
        scale: 0.8,
    },
    visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: {
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1],
        },
    },
    exit: {
        opacity: 0,
        x: 100,
        scale: 0.8,
        transition: {
            duration: 0.2,
            ease: [0.4, 0, 1, 1],
        },
    },
};

// Badge pulse
export const badgePulseVariants = {
    initial: {
        scale: 1,
    },
    animate: {
        scale: [1, 1.1, 1],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};

// Typing indicator
export const typingDotVariants = {
    initial: {
        y: 0,
    },
    animate: {
        y: [-5, 0, -5],
        transition: {
            duration: 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};

// Hero text reveal
export const heroTextVariants = {
    hidden: {
        opacity: 0,
        y: 50,
    },
    visible: (custom = 0) => ({
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            delay: custom * 0.2,
            ease: [0.4, 0, 0.2, 1],
        },
    }),
};

// Grid item stagger
export const gridItemVariants = {
    hidden: {
        opacity: 0,
        scale: 0.8,
    },
    visible: (index) => ({
        opacity: 1,
        scale: 1,
        transition: {
            delay: index * 0.05,
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1],
        },
    }),
};
