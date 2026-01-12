import React from 'react';
import './Loading.css';

const Loading = ({ text = 'INITIALIZING SYSTEM...' }) => {
    return (
        <div className="loading-container">
            <div className="loading-content">
                <div className="cyber-spinner">
                    <div className="spinner-inner"></div>
                    <div className="spinner-center"></div>
                </div>
                <div className="loading-text" data-text={text}>{text}</div>
                <div className="loading-bar">
                    <div className="progress"></div>
                </div>
            </div>
        </div>
    );
};

export default Loading;
