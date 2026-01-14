import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const Background = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({
                x: e.clientX,
                y: e.clientY
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[var(--cyber-black)]">
            {/* Grid Overlay */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `linear-gradient(var(--cyber-gray) 1px, transparent 1px),
                                    linear-gradient(90deg, var(--cyber-gray) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
                }}
            />

            {/* Glowing Orbs */}
            <motion.div
                animate={{
                    x: mousePosition.x * 0.05,
                    y: mousePosition.y * 0.05,
                }}
                className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, var(--neon-blue) 0%, transparent 70%)',
                    opacity: 0.1,
                    filter: 'blur(60px)',
                }}
            />

            <motion.div
                animate={{
                    x: mousePosition.x * -0.05,
                    y: mousePosition.y * -0.05,
                }}
                className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, var(--neon-purple) 0%, transparent 70%)',
                    opacity: 0.1,
                    filter: 'blur(80px)',
                }}
            />

            {/* Floating Particles (Simulated with simple divs for performance) */}
            <div className="absolute inset-0">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full bg-[var(--neon-green)]"
                        initial={{
                            x: Math.random() * window.innerWidth,
                            y: Math.random() * window.innerHeight,
                            opacity: 0
                        }}
                        animate={{
                            y: [null, Math.random() * -100],
                            opacity: [0, 0.5, 0]
                        }}
                        transition={{
                            duration: Math.random() * 5 + 5,
                            repeat: Infinity,
                            ease: "linear",
                            delay: Math.random() * 5
                        }}
                        style={{
                            width: Math.random() * 3 + 1,
                            height: Math.random() * 3 + 1,
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default Background;
