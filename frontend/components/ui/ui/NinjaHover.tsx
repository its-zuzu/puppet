import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';

interface NinjaHoverProps {
  children: React.ReactNode;
  className?: string;
}

export default function NinjaHover({ children, className = "" }: NinjaHoverProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);
  const [mouseTrail, setMouseTrail] = useState<{ id: number, x: number, y: number }[]>([]);
  const trailId = useRef(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);

    // Add to trail for "slash" effect
    if (isHovered) {
        const newTrail = { id: trailId.current++, x: mouseX, y: mouseY };
        setMouseTrail(prev => [...prev.slice(-10), newTrail]);
    }
  };

  const handleMouseEnter = () => setIsHovered(true);
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
    setMouseTrail([]);
  };

  return (
    <motion.div
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateY,
        rotateX,
        transformStyle: "preserve-3d",
      }}
      className={`relative group ${className}`}
    >
      <div style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}>
        {children}
      </div>
      
      {/* 3D "Blade Glint" Effect */}
      <motion.div
        style={{
          opacity: useTransform(mouseXSpring, [-0.5, 0.5], [0.1, 0.4]),
          transform: "translateZ(15px)",
        }}
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-purple-500/20 to-transparent transition-opacity group-hover:opacity-100"
      />

      {/* Katana Slash Trail */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
        {mouseTrail.map((point, i) => (
          <motion.div
            key={point.id}
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              left: point.x,
              top: point.y,
              width: '4px',
              height: '40px',
              backgroundColor: '#A855F7',
              boxShadow: '0 0 15px #A855F7',
              transform: `translate(-50%, -50%) rotate(${Math.atan2(y.get(), x.get()) * 180 / Math.PI}deg)`,
              filter: 'blur(1px)',
            }}
          />
        ))}
      </div>

      {/* Professional Border Glow */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl border border-purple-500/0 transition-colors duration-500 group-hover:border-purple-500/30" />
    </motion.div>
  );
}
