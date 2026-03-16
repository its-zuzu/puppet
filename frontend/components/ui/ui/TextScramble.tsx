import React, { useState, useEffect, useRef } from 'react';

interface TextScrambleProps {
  text: string;
  duration?: number;
  className?: string;
  autostart?: boolean;
}

const CHARS = '!<>-_\\/[]{}—=+*^?#________';

export const TextScramble: React.FC<TextScrambleProps> = ({ 
  text, 
  duration = 800, 
  className = "",
  autostart = true 
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const scramble = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    startTimeRef.current = performance.now();
    
    const animate = (now: number) => {
      const elapsed = now - (startTimeRef.current || 0);
      const progress = Math.min(elapsed / duration, 1);
      
      const scrambled = text
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' ';
          if (i / text.length < progress) return text[i];
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        })
        .join('');

      setDisplayText(scrambled);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (autostart) {
      scramble();
    }
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [text]);

  return (
    <span 
      className={className}
      onMouseEnter={() => !isAnimating && scramble()}
    >
      {displayText}
    </span>
  );
};
