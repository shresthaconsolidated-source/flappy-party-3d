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

  useFrame((state, delta) => {
    if (meshRef.current) {
        // Calculate velocity-based tilt
        const currentY = meshRef.current.position.y;
        const lastY = meshRef.current.userData.lastY ?? currentY;
        const velocity = (currentY - lastY) / (delta || 1/60);
        meshRef.current.userData.lastY = currentY;

        // Smoothly interpolate to target position
        meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, position[1], 0.3);

        // Advanced Rotation: Tilt + Bank
        // Tilt up when going up, down when falling
        const targetRotationX = -velocity * 0.2;
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotationX, 0.15);
        
        // Add a subtle "banking" effect
        const targetRotationZ = velocity * 0.1;
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotationZ, 0.1);

        // Breathing animation
        meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 4) * 0.015;

        // Squash and Stretch
        if (bodyRef.current) {
            const squashAmount = Math.abs(velocity) * 0.5;
            const targetScaleY = 1 + squashAmount;
            const targetScaleXZ = 1 - squashAmount * 0.5;
            
            bodyRef.current.scale.y = THREE.MathUtils.lerp(bodyRef.current.scale.y, THREE.MathUtils.clamp(targetScaleY, 0.7, 1.4), 0.2);
            bodyRef.current.scale.x = THREE.MathUtils.lerp(bodyRef.current.scale.x, THREE.MathUtils.clamp(targetScaleXZ, 0.8, 1.1), 0.2);
            bodyRef.current.scale.z = THREE.MathUtils.lerp(bodyRef.current.scale.z, THREE.MathUtils.clamp(targetScaleXZ, 0.8, 1.1), 0.2);
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
        <meshStandardMaterial 
          color={color} 
          roughness={0.05} 
          metalness={0.6} 
          emissive={color}
          emissiveIntensity={isLocal ? 0.4 : 0.1}
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
