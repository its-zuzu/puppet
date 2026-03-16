import { useEffect, useRef, useState } from 'react';

type TextScrambleProps = {
  text: string;
  duration?: number;
  className?: string;
  autostart?: boolean;
};

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!<>-_\\/[]{}=+*^?#';

export function TextScramble({
  text,
  duration = 800,
  className = '',
  autostart = true,
}: TextScrambleProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
    
  const cancelAnimation = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;  
    }
  };

  const scramble = () => {
    if (isAnimating) {
      return;
    }

    cancelAnimation();
    setIsAnimating(true);
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - (startTimeRef.current || 0);
      const progress = Math.min(elapsed / duration, 1);

      const scrambled = text
        .split('')
        .map((character, index) => {
          if (character === ' ') {
            return ' ';
          }

          if (index / Math.max(text.length, 1) < progress) {
            return text[index];
          }

          return CHARS[Math.floor(Math.random() * CHARS.length)];
        })
        .join('');

      setDisplayText(scrambled);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }

      setDisplayText(text);
      setIsAnimating(false);
      frameRef.current = null;
    };

    frameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    setDisplayText(text);

    if (autostart) {
      scramble();
    }

    return cancelAnimation;
  }, [autostart, text]);

  return (
    <span className={className} onMouseEnter={() => !isAnimating && scramble()}>
      {displayText}
    </span>
  );
}

export default TextScramble;