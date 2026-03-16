import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Stars, PerspectiveCamera, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

const Shuriken = ({ position, rotation, speed }: { position: [number, number, number], rotation: [number, number, number], speed: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += speed;
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime + position[0]) * 0.001;
    }
  });

  // Create a proper star-shaped 3D shuriken using a custom path extruded or a modified star geometry
  // For simplicity but better look, we'll use a thinner, sharper octahedron with emissive glints
  return (
    <Float speed={3} rotationIntensity={1} floatIntensity={1}>
      <mesh ref={meshRef} position={position} rotation={rotation}>
        <octahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial 
          color="#1a1a1a" 
          emissive="#7C3AED" 
          emissiveIntensity={4} 
          metalness={1} 
          roughness={0.1} 
        />
      </mesh>
    </Float>
  );
};

const SakuraPetal = ({ position, rotation, speed, offset }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);
    
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.y -= speed;
            meshRef.current.position.x += Math.sin(state.clock.elapsedTime + offset) * 0.01;
            meshRef.current.rotation.x += 0.02;
            meshRef.current.rotation.y += 0.01;
            
            if (meshRef.current.position.y < -10) {
                meshRef.current.position.y = 10;
            }
        }
    });

    return (
        <mesh ref={meshRef} position={position} rotation={rotation}>
            <planeGeometry args={[0.1, 0.15]} />
            <meshStandardMaterial color="#ffb7c5" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
    );
};

const Atmosphere = () => {
  const { viewport } = useThree();
  const count = 50;
  
  const petals = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      position: [(Math.random() - 0.5) * 20, Math.random() * 20 - 10, (Math.random() - 0.5) * 10] as [number, number, number],
      rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number],
      speed: 0.01 + Math.random() * 0.02,
      offset: Math.random() * 10,
    }));
  }, []);

  return (
    <group>
      <Sparkles count={50} scale={15} size={2} speed={0.5} opacity={0.3} color="#A855F7" />
      {petals.map((p, i) => (
        <SakuraPetal key={i} {...p} />
      ))}
    </group>
  );
};

export default function NinjaBackground() {
  const shurikens = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8
      ] as [number, number, number],
      rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number],
      speed: 0.02 + Math.random() * 0.06
    }));
  }, []);

  return (
    <div className="fixed inset-0 -z-10 bg-[#05000a]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.05)_0%,transparent_100%)]" />
      <Canvas dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} />
        <ambientLight intensity={0.1} />
        <pointLight position={[10, 10, 10]} intensity={2} color="#A855F7" />
        <pointLight position={[-10, -10, -5]} intensity={1} color="#C4B5FD" />
        
        <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
        
        <Atmosphere />
        
        {shurikens.map((s, i) => (
          <Shuriken key={i} position={s.position} rotation={s.rotation} speed={s.speed} />
        ))}
        
        <fog attach="fog" args={['#05000a', 2, 15]} />
      </Canvas>
    </div>
  );
}
