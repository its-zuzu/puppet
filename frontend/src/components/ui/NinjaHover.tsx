import { useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

type MouseTrailPoint = {
  id: number;
  x: number;
  y: number;
};

type NinjaHoverProps = {
  children: ReactNode;
  className?: string;
};

export default function NinjaHover({ children, className = '' }: NinjaHoverProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const trailIdRef = useRef(0);
  const [isHovered, setIsHovered] = useState(false);
  const [mouseTrail, setMouseTrail] = useState<MouseTrailPoint[]>([]);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['10deg', '-10deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-10deg', '10deg']);
  const bladeOpacity = useTransform(mouseXSpring, [-0.5, 0.5], [0.1, 0.4]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - bounds.left;
    const mouseY = event.clientY - bounds.top;
    const xPct = mouseX / bounds.width - 0.5;
    const yPct = mouseY / bounds.height - 0.5;

    x.set(xPct);
    y.set(yPct);

    if (isHovered) {
      const nextPoint = { id: trailIdRef.current, x: mouseX, y: mouseY };
      trailIdRef.current += 1;
      setMouseTrail((currentTrail) => [...currentTrail.slice(-10), nextPoint]);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
    setMouseTrail([]);
  };

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateY,
        rotateX,
        transformStyle: 'preserve-3d',
      }}
      className={`relative group ${className}`}
    >
      <div style={{ transform: 'translateZ(30px)', transformStyle: 'preserve-3d' }}>{children}</div>

      <motion.div
        style={{
          opacity: bladeOpacity,
          transform: 'translateZ(15px)',
        }}
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-purple-500/20 to-transparent transition-opacity group-hover:opacity-100"
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
        {mouseTrail.map((point) => (
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
              transform: `translate(-50%, -50%) rotate(${(Math.atan2(y.get(), x.get()) * 180) / Math.PI}deg)`,
              filter: 'blur(1px)',
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute -inset-px rounded-2xl border border-purple-500/0 transition-colors duration-500 group-hover:border-purple-500/30" />
    </motion.div>
  );
}