"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

function Cloud({ position, speed }: { position: [number, number, number], speed: number }) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (ref.current) {
        ref.current.position.x -= speed;
        if (ref.current.position.x < -25) ref.current.position.x = 25;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={ref} position={position}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.8} roughness={1} />
        </mesh>
        <mesh position={[0.8, -0.2, 0.2]}>
          <sphereGeometry args={[0.7, 16, 16]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.8} roughness={1} />
        </mesh>
        <mesh position={[-0.7, -0.1, -0.1]}>
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.8} roughness={1} />
        </mesh>
        <mesh position={[0.2, 0.4, -0.2]}>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.8} roughness={1} />
        </mesh>
      </group>
    </Float>
  );
}

function Mountain({ position, scale, color }: { position: [number, number, number], scale: number, color: string }) {
  const ruggedColor = new THREE.Color(color).multiplyScalar(0.8).getHex();
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Central Peak */}
      <mesh castShadow receiveShadow>
        <coneGeometry args={[5, 12, 5]} />
        <meshStandardMaterial color={color} roughness={1} flatShading />
      </mesh>
      {/* Rugged Side Peaks */}
      <mesh position={[3, -2, 2]} scale={0.6} castShadow>
        <coneGeometry args={[4, 10, 5]} />
        <meshStandardMaterial color={ruggedColor} roughness={1} flatShading />
      </mesh>
      <mesh position={[-3, -3, -2]} scale={0.7} castShadow>
        <coneGeometry args={[4, 10, 5]} />
        <meshStandardMaterial color={ruggedColor} roughness={1} flatShading />
      </mesh>
      {/* Snow Caps */}
      <mesh position={[0, 4.5, 0]}>
        <coneGeometry args={[1.5, 3.6, 5]} />
        <meshStandardMaterial color="white" roughness={0.5} flatShading />
      </mesh>
      <mesh position={[3, 1.5, 2]} scale={0.6}>
        <coneGeometry args={[1.5, 3.6, 5]} />
        <meshStandardMaterial color="white" roughness={0.5} flatShading />
      </mesh>
    </group>
  );
}

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.2, 8]} />
        <meshStandardMaterial color="#3f2314" roughness={1} />
      </mesh>
      {/* Organic Foliage Cluster */}
      <group position={[0, 1.2, 0]}>
        <mesh position={[0, 0.4, 0]} castShadow>
            <sphereGeometry args={[0.6, 8, 8]} />
            <meshStandardMaterial color="#064e3b" roughness={1} flatShading />
        </mesh>
        <mesh position={[0.3, 0, 0.2]} castShadow>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshStandardMaterial color="#065f46" roughness={1} flatShading />
        </mesh>
        <mesh position={[-0.3, 0.1, -0.2]} castShadow>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshStandardMaterial color="#065f46" roughness={1} flatShading />
        </mesh>
      </group>
    </group>
  );
}

export function Environment() {
  const floorRef = useRef<THREE.Mesh>(null);
  const sceneryRef = useRef<THREE.Group>(null);
  const hillsRef = useRef<THREE.Group>(null);
  
  // Day/Night Cycle State
  const bgColor = useRef(new THREE.Color('#7dd3fc'));
  const fogColor = useRef(new THREE.Color('#bae6fd'));

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Scroll scenery at different speeds for parallax
    if (sceneryRef.current) sceneryRef.current.position.x = -(time * 0.5) % 40;
    if (hillsRef.current) hillsRef.current.position.x = -(time * 1.2) % 40;
    
    if (floorRef.current) {
        const material = floorRef.current.material as THREE.MeshStandardMaterial;
        if (material.map) material.map.offset.x += 0.005;
    }

    const cycle = (time % 120) / 120;
    bgColor.current.lerpColors(new THREE.Color('#7dd3fc'), new THREE.Color('#0f172a'), Math.sin(cycle * Math.PI));
    fogColor.current.lerpColors(new THREE.Color('#bae6fd'), new THREE.Color('#1e293b'), Math.sin(cycle * Math.PI));
  });

  return (
    <>
      <color attach="background" args={[bgColor.current.getHex()]} />
      <fog attach="fog" args={[fogColor.current.getHex(), 15, 60]} />
      
      <ambientLight intensity={0.4} />
      <directionalLight position={[30, 40, 20]} intensity={1.5} castShadow shadow-camera-far={100} />
      
      {/* Stylized Sun/Moon */}
      <group position={[20, 25, -50]}>
        <mesh>
            <sphereGeometry args={[4, 32, 32]} />
            <meshBasicMaterial color="#fef08a" />
        </mesh>
        <pointLight intensity={2} color="#fef08a" distance={100} />
      </group>
      
      {/* Distant Mountains (Parallax Layer 1) */}
      <group ref={sceneryRef}>
        {[...Array(5)].map((_, i) => (
          <group key={i} position={[i * 20 - 20, 0, 0]}>
            <Mountain position={[-5, 0, -35]} scale={2.5} color="#475569" />
            <Mountain position={[5, -1, -40]} scale={3.2} color="#334155" />
            <Mountain position={[12, -0.5, -30]} scale={2.2} color="#475569" />
          </group>
        ))}
      </group>

      {/* Mid-ground Hills & Terai (Parallax Layer 2) */}
      <group ref={hillsRef}>
        {[...Array(8)].map((_, i) => (
          <group key={i} position={[i * 15 - 30, 0, 0]}>
            {/* Hill */}
            <mesh position={[0, -4, -20]} rotation={[-Math.PI / 2.2, 0, 0]}>
              <sphereGeometry args={[10, 32, 32, 0, Math.PI * 2, 0, Math.PI / 3]} />
              <meshStandardMaterial color="#065f46" roughness={1} />
            </mesh>
            {/* Terai Trees */}
            <Tree position={[2, -4.5, -15]} />
            <Tree position={[-3, -4.5, -12]} />
            <Tree position={[6, -4.5, -18]} />
          </group>
        ))}
      </group>

      {/* Clouds */}
      <Cloud position={[15, 10, -15]} speed={0.005} />
      <Cloud position={[-10, 12, -25]} speed={0.003} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow ref={floorRef}>
        <planeGeometry args={[200, 100]} />
        <meshStandardMaterial color="#14532d" roughness={0.8} />
      </mesh>
      
      {/* Subtle Grid overlay for that game feel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.99, 0]}>
        <planeGeometry args={[200, 100]} />
        <meshStandardMaterial color="#166534" wireframe opacity={0.1} transparent />
      </mesh>

      <ContactShadows position={[0, -4.98, 0]} opacity={0.4} scale={50} blur={2.5} far={20} />
    </>
  );
}
