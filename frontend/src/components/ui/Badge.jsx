import React from 'react';
import './Badge.css';

/**
 * Badge Component
 * For difficulty levels, categories, status indicators
 */
const Badge = ({
    children,
    variant = 'default',
    size = 'md',
    pulse = false,
    className = '',
    ...props
}) => {
    const badgeClass = `
    badge
    badge-${variant}
    badge-${size}
    ${pulse ? 'badge-pulse' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

    return (
        <span className={badgeClass} {...props}>
            {children}
        </span>
    );
};

export default Badge;
