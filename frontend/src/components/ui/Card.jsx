import React from 'react';
import { motion } from 'framer-motion';
import { cardHoverVariants } from '../../utils/animations';
import './Card.css';

/**
 * Glassmorphic Card Component
 * Variants: default, elevated, bordered, glow
 */
const Card = ({
    children,
    variant = 'default',
    padding = 'md',
    hoverable = false,
    glowOnHover = false,
    className = '',
    onClick,
    ...props
}) => {
    const cardClass = `
    card
    card-${variant}
    card-padding-${padding}
    ${hoverable ? 'card-hoverable' : ''}
    ${glowOnHover ? 'card-glow-hover' : ''}
    ${onClick ? 'card-clickable' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

    const MotionComponent = hoverable ? motion.div : 'div';
    const motionProps = hoverable
        ? {
            variants: cardHoverVariants,
            initial: 'rest',
            whileHover: 'hover',
            whileTap: onClick ? 'tap' : 'hover',
        }
        : {};

    return (
        <MotionComponent
            className={cardClass}
            onClick={onClick}
            {...motionProps}
            {...props}
        >
            {children}
        </MotionComponent>
    );
};

// Card Header
export const CardHeader = ({ children, className = '', ...props }) => (
    <div className={`card-header ${className}`} {...props}>
        {children}
    </div>
);

// Card Body
export const CardBody = ({ children, className = '', ...props }) => (
    <div className={`card-body ${className}`} {...props}>
        {children}
    </div>
);

// Card Footer
export const CardFooter = ({ children, className = '', ...props }) => (
    <div className={`card-footer ${className}`} {...props}>
        {children}
    </div>
);

// Card Title
export const CardTitle = ({ children, className = '', ...props }) => (
    <h3 className={`card-title ${className}`} {...props}>
        {children}
    </h3>
);

// Card Description
export const CardDescription = ({ children, className = '', ...props }) => (
    <p className={`card-description ${className}`} {...props}>
        {children}
    </p>
);

export default Card;
