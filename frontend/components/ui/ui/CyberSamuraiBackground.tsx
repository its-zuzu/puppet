import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Stars, Float, MeshDistortMaterial, Sparkles, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// --- Components ---

// --- Components ---

const EnergyPulses = () => {
    const groupRef = useRef<THREE.Group>(null);
    const ringCount = 3;
    const rings = useMemo(() => [...Array(ringCount)].map((_, i) => ({
        id: i,
        delay: i * 2,
    })), []);

    useFrame((state) => {
        if (!groupRef.current) return;
        groupRef.current.children.forEach((child, i) => {
            const ring = child as THREE.Mesh;
            const time = (state.clock.elapsedTime + rings[i].delay) % 6;
            const scale = time * 4;
            ring.scale.set(scale, scale, 1);
            const material = ring.material as THREE.MeshBasicMaterial;
            material.opacity = Math.max(0, 0.3 * (1 - time / 6));
        });
    });

    return (
        <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
            {rings.map((r) => (
                <mesh key={r.id}>
                    <ringGeometry args={[1, 1.05, 64]} />
                    <meshBasicMaterial color="#A855F7" transparent opacity={0} />
                </mesh>
            ))}
        </group>
    );
};

const CyberGrid = () => {
    const points = useMemo(() => {
        const p = [];
        // Tighter grid
        for (let x = -30; x <= 30; x += 1.5) {
            for (let z = -30; z <= 30; z += 1.5) {
                p.push(x, -5, z);
            }
        }
        return new Float32Array(p);
    }, []);

    const meshRef = useRef<THREE.Points>(null);
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.z = (state.clock.elapsedTime * 1.5) % 1.5;
        }
    });

    return (
        <group>
            <Points positions={points}>
                <PointMaterial
                    transparent
                    color="#A855F7"
                    size={0.04}
                    sizeAttenuation={true}
                    depthWrite={false}
                    opacity={0.3}
                />
            </Points>
            {/* Horizontal lines to make it a grid */}
            {[...Array(41)].map((_, i) => (
                <mesh key={i} position={[0, -5, (i - 20) * 1.5]} rotation={[Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[60, 0.005]} />
                    <meshBasicMaterial color="#3B0764" transparent opacity={0.15} />
                </mesh>
            ))}
        </group>
    );
};

const InteractiveParticles = () => {
    const { mouse, viewport } = useThree();
    const count = 600; // Increased count
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 30;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
            
            velocities[i * 3] = (Math.random() - 0.5) * 0.02;
            velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;

            colors[i * 3] = 0.6; // R
            colors[i * 3 + 1] = 0.3; // G
            colors[i * 3 + 2] = 0.9; // B
        }
        return { pos, velocities, colors };
    }, []);

    const pointsRef = useRef<THREE.Points>(null);

    useFrame((state) => {
        if (!pointsRef.current) return;
        const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
        // const colorAttr = pointsRef.current.geometry.attributes.color as THREE.BufferAttribute;
        
        for (let i = 0; i < count; i++) {
            let px = posAttr.getX(i);
            let py = posAttr.getY(i);
            let pz = posAttr.getZ(i);

            // Move based on velocity
            px += positions.velocities[i * 3];
            py += positions.velocities[i * 3 + 1];
            pz += positions.velocities[i * 3 + 2];

            // Hover reaction
            const mx = (mouse.x * viewport.width) / 2;
            const my = (mouse.y * viewport.height) / 2;
            
            const dx = px - mx;
            const dy = py - my;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 4) {
                const force = (4 - dist) / 4;
                px += dx * force * 0.1;
                py += dy * force * 0.1;
            }

            // Boundary wrap
            if (px > 20) px = -20; if (px < -20) px = 20;
            if (py > 20) py = -20; if (py < -20) py = 20;
            if (pz > 15) pz = -15; if (pz < -15) pz = 15;

            posAttr.setXYZ(i, px, py, pz);
        }
        posAttr.needsUpdate = true;
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions.pos}
                    itemSize={3}
                />
            </bufferGeometry>
            <PointMaterial
                transparent
                color="#E879F9"
                size={0.07}
                sizeAttenuation={true}
                depthWrite={false}
                opacity={0.6}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

const Scene = () => {
    const { mouse, viewport } = useThree();
    const cameraRef = useRef<THREE.Group>(null);
    const cursorLightRef = useRef<THREE.PointLight>(null);
    const trailRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        const mx = (mouse.x * viewport.width) / 2;
        const my = (mouse.y * viewport.height) / 2;

        if (cameraRef.current) {
            cameraRef.current.position.x += (mouse.x * 0.6 - cameraRef.current.position.x) * 0.05;
            cameraRef.current.position.y += (mouse.y * 0.2 - cameraRef.current.position.y) * 0.05;
        }

        if (cursorLightRef.current) {
            cursorLightRef.current.position.x = mx;
            cursorLightRef.current.position.y = my;
            cursorLightRef.current.intensity = 5 + Math.sin(state.clock.elapsedTime * 4) * 2;
        }

        if (trailRef.current) {
            trailRef.current.position.x += (mx - trailRef.current.position.x) * 0.1;
            trailRef.current.position.y += (my - trailRef.current.position.y) * 0.1;
        }
    });

    return (
        <group ref={cameraRef}>
            <Stars radius={120} depth={60} count={8000} factor={4} saturation={0} fade speed={1.5} />
            <Sparkles count={200} scale={25} size={1.4} speed={0.6} opacity={0.4} color="#C4B5FD" />
            <CyberGrid />
            <InteractiveParticles />
            <EnergyPulses />
            
            {/* Ambient Base Light */}
            <pointLight position={[0, 0, 8]} intensity={1.5} color="#3B0764" />
            
            {/* Interactive Cursor Light (The Ripple/Glow) */}
            <pointLight 
                ref={cursorLightRef} 
                position={[0, 0, 2]} 
                intensity={6} 
                distance={8} 
                color="#A855F7" 
            />

            {/* Subtle Trail Effect */}
            <group ref={trailRef}>
                <Sparkles count={20} scale={2} size={2} speed={1} opacity={0.5} color="#E879F9" />
            </group>
        </group>
    );
};

// --- Main Wrapper Component ---

interface Props {
    children?: React.ReactNode;
}

export default function CyberSamuraiBackground({ children }: Props) {
    const [isGlitching, setIsGlitching] = useState(false);

    useEffect(() => {
        const triggerGlitch = () => {
            setIsGlitching(true);
            setTimeout(() => setIsGlitching(false), 150);
            setTimeout(triggerGlitch, Math.random() * 5000 + 2000);
        };
        const timer = setTimeout(triggerGlitch, 3000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`relative isolate w-full min-h-screen transition-opacity duration-300 ${isGlitching ? 'opacity-90 grayscale-[0.2]' : ''}`}>
            {/* 3D Canvas */}
            <div className="fixed inset-0 -z-10 bg-[#05000a]">
                <Canvas dpr={[1, 2]}>
                    <PerspectiveCamera makeDefault position={[0, 0, 10]} />
                    <ambientLight intensity={0.2} />
                    <Scene />
                    <fog attach="fog" args={['#05000a', 5, 25]} />
                </Canvas>
            </div>

            {/* Subtle Glitch Overlay Patterns */}
            <div className={`pointer-events-none fixed inset-0 z-0 opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] ${isGlitching ? 'opacity-[0.05]' : ''}`} />

            {/* Content Layer */}
            <div className="relative z-10 w-full min-h-screen">
                {children}
            </div>
        </div>
    );
}
