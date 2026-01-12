import React from 'react';
import './Loading.css';

const Loading = ({
    text = 'Loading',
    size = 'large', // 'small', 'medium', 'large'
    inline = false
}) => {
    return (
        <div className={`loading-container ${inline ? 'loading-inline' : ''} loading-${size}`}>
            <div className="loading-content">
                <div className="cyber-spinner">
                    <div className="spinner-ring"></div>
                    <div className="spinner-center"></div>
                </div>
                <div className="loading-text">{text}</div>
            </div>
        </div>
    );
};

export default Loading;
