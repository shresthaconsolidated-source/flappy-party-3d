"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Float, Text } from "@react-three/drei";

interface BirdProps {
  position: [number, number, number];
  color: string;
  name: string;
  isLocal?: boolean;
}

export function Bird({ position, color, name, isLocal }: BirdProps) {
  const meshRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const wingRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
        // Simple smoothing for position
        meshRef.current.position.lerp(new THREE.Vector3(...position), 0.2);
        
        // Tilt based on vertical velocity
        const velocity = (position[1] - meshRef.current.position.y);
        const targetRotation = Math.min(Math.max(velocity * 8, -0.6), 0.6);
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotation, 0.1);

        // Squash and Stretch Logic
        if (bodyRef.current) {
            const squashFactor = Math.abs(velocity) * 2;
            bodyRef.current.scale.set(
                1 - squashFactor * 0.5, // Squash/Stretch X
                1 + squashFactor,       // Squash/Stretch Y
                1 - squashFactor * 0.5  // Squash/Stretch Z
            );
            // Decay scale back to 1
            bodyRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        }
    }
    
    if (wingRef.current) {
        const wingSpeed = isLocal ? 20 : 15;
        wingRef.current.rotation.x = Math.sin(state.clock.elapsedTime * wingSpeed) * 0.6;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Name Tag - Premium Floating */}
      <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
        <Text
          position={[0, 1, 0]}
          fontSize={0.25}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {name}
        </Text>
      </Float>

      {/* Bird Body */}
      <mesh ref={bodyRef} castShadow>
        <sphereGeometry args={[0.35, 64, 64]} />
        <meshStandardMaterial color={color} roughness={0.1} metalness={0.4} />
      </mesh>

      {/* Eye - More detailed */}
      <group position={[0.2, 0.15, 0.2]}>
        <mesh>
          <sphereGeometry args={[0.08, 32, 32]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0.05, 0, 0]}>
          <sphereGeometry args={[0.04, 32, 32]} />
          <meshStandardMaterial color="black" />
        </mesh>
      </group>

      {/* Beak */}
      <mesh position={[0.4, -0.05, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.12, 0.25, 32]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.2} />
      </mesh>

      {/* Wing */}
      <mesh ref={wingRef} position={[-0.1, 0, 0.35]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.25, 0.05, 0.35]} />
        <meshStandardMaterial color={color} roughness={0.2} />
      </mesh>
      
      {isLocal && (
        <group>
          <mesh position={[0, 0, 0]}>
            <ringGeometry args={[0.5, 0.55, 64]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
          <pointLight color="#fbbf24" intensity={0.5} distance={2} />
        </group>
      )}
    </group>
  );
}
