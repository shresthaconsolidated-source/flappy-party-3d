"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, ContactShadows, useTexture, Environment as DreiEnvironment } from "@react-three/drei";
import * as THREE from "three";

function Cloud({ position, speed }: { position: [number, number, number], speed: number }) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (ref.current) {
        ref.current.position.x -= speed;
        if (ref.current.position.x < -20) ref.current.position.x = 20;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group ref={ref} position={position}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.5, 0.4, 0.8]} />
          <meshStandardMaterial color="white" roughness={0.1} />
        </mesh>
        <mesh position={[0.4, 0.3, 0]}>
          <boxGeometry args={[0.8, 0.4, 0.6]} />
          <meshStandardMaterial color="white" roughness={0.1} />
        </mesh>
      </group>
    </Float>
  );
}

export function Environment() {
  const floorRef = useRef<THREE.Mesh>(null);
  
  // Create a better procedural grid texture if possible, or stick to a clean one
  const gridTexture = useTexture('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/grid.png');
  
  useMemo(() => {
    if (gridTexture) {
      gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;
      gridTexture.repeat.set(20, 4);
      gridTexture.anisotropy = 16;
    }
  }, [gridTexture]);

  useFrame((state) => {
    if (floorRef.current) {
        const material = floorRef.current.material as THREE.MeshStandardMaterial;
        if (material.map) {
            material.map.offset.x += 0.005; // Smooth scroll
        }
    }
  });

  return (
    <>
      <color attach="background" args={['#0ea5e9']} />
      <fog attach="fog" args={['#0ea5e9', 10, 25]} />
      
      {/* Premium Lighting */}
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      >
        <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10, 0.1, 50]} />
      </directionalLight>
      
      {/* Studio Lighting - Backlight for depth */}
      <pointLight position={[-10, 5, -5]} intensity={1} color="#ffffff" />
      
      <DreiEnvironment preset="city" />

      {/* Moving Clouds in Background */}
      <Cloud position={[10, 4, -5]} speed={0.01} />
      <Cloud position={[0, 6, -8]} speed={0.005} />
      <Cloud position={[-15, 3, -6]} speed={0.015} />
      <Cloud position={[5, 7, -10]} speed={0.008} />

      {/* Smooth Moving Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow ref={floorRef}>
        <planeGeometry args={[100, 40]} />
        <meshStandardMaterial 
            color="#0369a1" 
            map={gridTexture}
            transparent
            opacity={0.8}
            roughness={0.1}
            metalness={0.2}
        />
      </mesh>

      <ContactShadows 
         position={[0, -4.9, 0]} 
         opacity={0.4} 
         scale={20} 
         blur={2} 
         far={10} 
         color="#000000" 
      />
    </>
  );
}
