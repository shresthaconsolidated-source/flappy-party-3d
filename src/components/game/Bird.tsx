"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Float, Text, Trail } from "@react-three/drei";

interface BirdProps {
  position: [number, number, number];
  color: string;
  name: string;
  isLocal?: boolean;
  score?: number;
}

export function Bird({ position, color, name, isLocal, score = 0 }: BirdProps) {
  const meshRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const wingRef = useRef<THREE.Mesh>(null);

  const getRank = (s: number) => {
    if (s >= 50) return { title: "LEGEND", color: "#f87171" };
    if (s >= 20) return { title: "ELITE", color: "#fbbf24" };
    if (s >= 10) return { title: "PRO", color: "#60a5fa" };
    return { title: "ROOKIE", color: "#9ca3af" };
  };

  const rank = getRank(score);

  useFrame((state, delta) => {
    if (meshRef.current) {
        const currentY = meshRef.current.position.y;
        const lastY = meshRef.current.userData.lastY ?? currentY;
        const velocity = (currentY - lastY) / (delta || 1/60);
        meshRef.current.userData.lastY = currentY;

        meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, position[1], 0.3);

        const targetRotationX = -velocity * 0.2;
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotationX, 0.15);
        
        const targetRotationZ = velocity * 0.1;
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotationZ, 0.1);

        meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 4) * 0.015;

        // Squash and Stretch
        if (bodyRef.current) {
            const squashAmount = Math.abs(velocity) * 0.5;
            bodyRef.current.scale.y = THREE.MathUtils.lerp(bodyRef.current.scale.y, THREE.MathUtils.clamp(1 + squashAmount, 0.7, 1.4), 0.2);
            bodyRef.current.scale.x = bodyRef.current.scale.z = THREE.MathUtils.lerp(bodyRef.current.scale.x, THREE.MathUtils.clamp(1 - squashAmount * 0.5, 0.8, 1.1), 0.2);
        }
    }
    
    if (wingRef.current) {
        const wingSpeed = isLocal ? 20 : 15;
        wingRef.current.rotation.x = Math.sin(state.clock.elapsedTime * wingSpeed) * 0.6;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Rank Title & Name Tag */}
      <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
        <group position={[0, 1.2, 0]}>
            <Text
              fontSize={0.12}
              color={rank.color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.01}
              outlineColor="#000000"
              fontWeight="black"
              position={[0, 0.25, 0]}
            >
              {rank.title}
            </Text>
            <Text
              fontSize={0.25}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="#000000"
              fontWeight="black"
            >
              {name}
            </Text>
        </group>
      </Float>

      {/* Motion Trail - Professional Ribbon */}
      <Trail
        width={0.6}
        length={4}
        color={color}
        attenuation={(t) => t * t}
      >
        <object3D position={[-0.3, 0, 0]} />
      </Trail>

      {/* Bird Body */}
      <mesh ref={bodyRef} castShadow>
        <sphereGeometry args={[0.35, 64, 64]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.05} 
          metalness={0.8} 
          emissive={color}
          emissiveIntensity={isLocal ? 0.6 : 0.2}
        />
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
