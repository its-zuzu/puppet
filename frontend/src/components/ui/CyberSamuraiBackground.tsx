import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  PerspectiveCamera,
  PointMaterial,
  Points,
  Sparkles,
  Stars,
} from '@react-three/drei';
import * as THREE from 'three';

const EnergyPulses = () => {
  const groupRef = useRef<THREE.Group>(null);
  const rings = useMemo(
    () =>
      Array.from({ length: 3 }, (_, index) => ({
        id: index,
        delay: index * 2,
      })),
    []
  );

  useFrame((state) => {
    if (!groupRef.current) {
      return;
    }

    groupRef.current.children.forEach((child, index) => {
      const ring = child as THREE.Mesh;
      const time = (state.clock.elapsedTime + rings[index].delay) % 6;
      const scale = time * 4;
      ring.scale.set(scale, scale, 1);

      const material = ring.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, 0.3 * (1 - time / 6));
    });
  });

  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
      {rings.map((ring) => (
        <mesh key={ring.id}>
          <ringGeometry args={[1, 1.05, 64]} />
          <meshBasicMaterial color="#A855F7" transparent opacity={0} />
        </mesh>
      ))}
    </group>
  );
};

const CyberGrid = () => {
  const groupRef = useRef<THREE.Group>(null);
  const points = useMemo(() => {
    const values: number[] = [];

    for (let x = -30; x <= 30; x += 1.5) {
      for (let z = -30; z <= 30; z += 1.5) {
        values.push(x, -5, z);
      }
    }

    return new Float32Array(values);
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.z = (state.clock.elapsedTime * 1.5) % 1.5;
    }
  });

  return (
    <group ref={groupRef}>
      <Points positions={points}>
        <PointMaterial
          transparent
          color="#A855F7"
          size={0.04}
          sizeAttenuation
          depthWrite={false}
          opacity={0.3}
        />
      </Points>
      {Array.from({ length: 41 }, (_, index) => (
        <mesh
          key={index}
          position={[0, -5, (index - 20) * 1.5]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[60, 0.005]} />
          <meshBasicMaterial color="#3B0764" transparent opacity={0.15} />
        </mesh>
      ))}
    </group>
  );
};

const InteractiveParticles = () => {
  const { mouse, viewport } = useThree();
  const count = 600;
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 30;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 20;

      velocities[index * 3] = (Math.random() - 0.5) * 0.02;
      velocities[index * 3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[index * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }

    return { positions, velocities };
  }, [count]);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame(() => {
    if (!pointsRef.current) {
      return;
    }

    const positions = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const mouseX = (mouse.x * viewport.width) / 2;
    const mouseY = (mouse.y * viewport.height) / 2;

    for (let index = 0; index < count; index += 1) {
      let pointX = positions.getX(index);
      let pointY = positions.getY(index);
      let pointZ = positions.getZ(index);

      pointX += particles.velocities[index * 3];
      pointY += particles.velocities[index * 3 + 1];
      pointZ += particles.velocities[index * 3 + 2];

      const dx = pointX - mouseX;
      const dy = pointY - mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 4) {
        const force = (4 - distance) / 4;
        pointX += dx * force * 0.1;
        pointY += dy * force * 0.1;
      }

      if (pointX > 20) pointX = -20;
      if (pointX < -20) pointX = 20;
      if (pointY > 20) pointY = -20;
      if (pointY < -20) pointY = 20;
      if (pointZ > 15) pointZ = -15;
      if (pointZ < -15) pointZ = 15;

      positions.setXYZ(index, pointX, pointY, pointZ);
    }

    positions.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <PointMaterial
        transparent
        color="#E879F9"
        size={0.07}
        sizeAttenuation
        depthWrite={false}
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const Scene = () => {
  const { mouse, viewport } = useThree();
  const cameraGroupRef = useRef<THREE.Group>(null);
  const cursorLightRef = useRef<THREE.PointLight>(null);
  const trailRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const mouseX = (mouse.x * viewport.width) / 2;
    const mouseY = (mouse.y * viewport.height) / 2;

    if (cameraGroupRef.current) {
      cameraGroupRef.current.position.x +=
        (mouse.x * 0.6 - cameraGroupRef.current.position.x) * 0.05;
      cameraGroupRef.current.position.y +=
        (mouse.y * 0.2 - cameraGroupRef.current.position.y) * 0.05;
    }

    if (cursorLightRef.current) {
      cursorLightRef.current.position.x = mouseX;
      cursorLightRef.current.position.y = mouseY;
      cursorLightRef.current.intensity = 5 + Math.sin(state.clock.elapsedTime * 4) * 2;
    }

    if (trailRef.current) {
      trailRef.current.position.x += (mouseX - trailRef.current.position.x) * 0.1;
      trailRef.current.position.y += (mouseY - trailRef.current.position.y) * 0.1;
    }
  });

  return (
    <group ref={cameraGroupRef}>
      <Stars radius={120} depth={60} count={8000} factor={4} saturation={0} fade speed={1.5} />
      <Sparkles count={200} scale={25} size={1.4} speed={0.6} opacity={0.4} color="#C4B5FD" />
      <CyberGrid />
      <InteractiveParticles />
      <EnergyPulses />
      <pointLight position={[0, 0, 8]} intensity={1.5} color="#3B0764" />
      <pointLight ref={cursorLightRef} position={[0, 0, 2]} intensity={6} distance={8} color="#A855F7" />
      <group ref={trailRef}>
        <Sparkles count={20} scale={2} size={2} speed={1} opacity={0.5} color="#E879F9" />
      </group>
    </group>
  );
};

type CyberSamuraiBackgroundProps = {
  children?: ReactNode;
};

export default function CyberSamuraiBackground({ children }: CyberSamuraiBackgroundProps) {
  const [isGlitching, setIsGlitching] = useState(false);
  const glitchTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const scheduleGlitch = (delay: number) => {
      glitchTimerRef.current = window.setTimeout(() => {
        setIsGlitching(true);
        resetTimerRef.current = window.setTimeout(() => {
          setIsGlitching(false);
        }, 150);
        scheduleGlitch(Math.random() * 5000 + 2000);
      }, delay);
    };

    scheduleGlitch(3000);

    return () => {
      if (glitchTimerRef.current !== null) {
        window.clearTimeout(glitchTimerRef.current);
      }
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`relative isolate min-h-screen w-full transition-opacity duration-300 ${
        isGlitching ? 'opacity-90 grayscale-[0.2]' : ''
      }`}
    >
      <div className="fixed inset-0 -z-10 bg-[#05000a]">
        <Canvas dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[0, 0, 10]} />
          <ambientLight intensity={0.2} />
          <Scene />
          <fog attach="fog" args={['#05000a', 5, 25]} />
        </Canvas>
      </div>

      <div
        className={`pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] ${
          isGlitching ? 'opacity-[0.05]' : 'opacity-[0.02]'
        }`}
      />

      <div className="relative z-10 min-h-screen w-full">{children}</div>
    </div>
  );
}