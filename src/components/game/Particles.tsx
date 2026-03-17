"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticlesProps {
  count?: number;
  position: [number, number, number];
  color: string;
  type: 'jump' | 'crash';
}

export function Particles({ count = 20, position, color, type }: ParticlesProps) {
  const meshRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const life = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      const angle = Math.random() * Math.PI * 2;
      const speed = type === 'crash' ? Math.random() * 0.2 : Math.random() * 0.1;
      
      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = Math.sin(angle) * speed;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * speed;
      
      life[i] = 1.0;
    }
    
    return { positions, velocities, life };
  }, [count, type]);

  useFrame((state, delta) => {
    if (meshRef.current) {
        const posAttr = meshRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
        
        for (let i = 0; i < count; i++) {
            particles.life[i] -= delta * (type === 'crash' ? 1.0 : 2.0);
            
            if (particles.life[i] > 0) {
                posAttr.array[i * 3] += particles.velocities[i * 3];
                posAttr.array[i * 3 + 1] += particles.velocities[i * 3 + 1];
                posAttr.array[i * 3 + 2] += particles.velocities[i * 3 + 2];
                // Gravity for particles
                particles.velocities[i * 3 + 1] -= 0.005;
            } else {
                // Keep them invisible once dead
                posAttr.array[i * 3] = 999;
            }
        }
        
        posAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={meshRef} position={position}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
          args={[particles.positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        attach="material"
        color={color}
        size={type === 'crash' ? 0.15 : 0.08}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
