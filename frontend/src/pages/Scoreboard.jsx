import React from 'react';
import { motion } from 'framer-motion';
import { pageVariants } from '../utils/animations';
import CTFdScoreboardGraph from '../components/CTFdScoreboardGraph';
import './Scoreboard.css';

const Scoreboard = () => {
  return (
    <motion.div
      className="scoreboard-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="scoreboard-header">
        <h1>Scoreboard</h1>
        <p>Track your progress and compete with other teams</p>
      </div>
      
      <CTFdScoreboardGraph />
    </motion.div>
  );
};

export default Scoreboard;
