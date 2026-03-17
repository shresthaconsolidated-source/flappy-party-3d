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

        // Tilt based on velocity (Juice)
        const targetRotationX = -velocity * 0.3;
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
    
    // Wing Flapping Animation
    if (meshRef.current) {
        const wingL = meshRef.current.getObjectByName("wingL");
        const wingR = meshRef.current.getObjectByName("wingR");
        if (wingL && wingR) {
            const flapSpeed = isLocal ? 25 : 18;
            const flapAngle = Math.sin(state.clock.elapsedTime * flapSpeed) * 0.8;
            wingL.rotation.z = flapAngle;
            wingR.rotation.z = -flapAngle;
        }
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

      {/* Motion Trail */}
      <Trail width={0.4} length={3} color={color} attenuation={(t) => t * t}>
        <object3D position={[-0.3, 0, 0]} />
      </Trail>

      {/* Bird Body Structure */}
      <group>
        {/* Main Body */}
        <mesh ref={bodyRef} castShadow>
            <sphereGeometry args={[0.35, 32, 32]} />
            <meshStandardMaterial 
                color={color} 
                roughness={0.2} 
                metalness={0.5} 
                emissive={color}
                emissiveIntensity={isLocal ? 0.3 : 0.1}
            />
        </mesh>

        {/* Tail Feathers */}
        <mesh position={[-0.35, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.2, 0.2, 0.05]} />
            <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>

        {/* Beak */}
        <mesh position={[0.35, -0.05, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.1, 0.25, 8]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.3} />
        </mesh>

        {/* Eyes */}
        <group position={[0.2, 0.1, 0]}>
            <mesh position={[0, 0, 0.18]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial color="white" />
                <mesh position={[0.05, 0, 0.02]}>
                    <sphereGeometry args={[0.04, 8, 8]} />
                    <meshStandardMaterial color="black" />
                </mesh>
            </mesh>
            <mesh position={[0, 0, -0.18]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial color="white" />
                <mesh position={[0.05, 0, -0.02]}>
                    <sphereGeometry args={[0.04, 8, 8]} />
                    <meshStandardMaterial color="black" />
                </mesh>
            </mesh>
        </group>

        {/* Wings (Animated) */}
        <group name="wingL" position={[0, 0, 0.3]}>
            <mesh position={[0, 0, 0.15]}>
                <boxGeometry args={[0.3, 0.02, 0.3]} />
                <meshStandardMaterial color={color} roughness={0.4} />
            </mesh>
        </group>
        <group name="wingR" position={[0, 0, -0.3]}>
            <mesh position={[0, 0, -0.15]}>
                <boxGeometry args={[0.3, 0.02, 0.3]} />
                <meshStandardMaterial color={color} roughness={0.4} />
            </mesh>
        </group>
      </group>
      
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
