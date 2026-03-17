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
  const wingRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
        // Simple smoothing for position
        meshRef.current.position.lerp(new THREE.Vector3(...position), 0.2);
        
        // Tilt based on vertical velocity (approximated)
        const tilt = Math.min(Math.max((position[1] - meshRef.current.position.y) * 10, -0.5), 0.5);
        meshRef.current.rotation.z = tilt;
    }
    
    if (wingRef.current) {
        wingRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 15) * 0.5;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Name Tag */}
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>

      {/* Bird Body */}
      <mesh castShadow>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Eye */}
      <mesh position={[0.2, 0.1, 0.2]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0.26, 0.1, 0.2]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>

      {/* Beak */}
      <mesh position={[0.35, -0.05, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.1, 0.2, 16]} />
        <meshStandardMaterial color="orange" />
      </mesh>

      {/* Wing */}
      <mesh ref={wingRef} position={[-0.1, 0, 0.3]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {isLocal && (
        <mesh position={[0, 0, 0]}>
          <ringGeometry args={[0.4, 0.45, 32]} />
          <meshBasicMaterial color="yellow" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}
