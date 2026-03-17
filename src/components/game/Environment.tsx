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
  
  // Create a procedural grid texture to avoid external asset freezes
  const gridTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#0369a1';
        ctx.fillRect(0, 0, 128, 128);
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, 128, 128);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(20, 4);
    return tex;
  }, []);

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
      <color attach="background" args={['#075985']} />
      
      {/* Heavy Studio Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[20, 20, 10]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      >
        <orthographicCamera attach="shadow-camera" args={[-15, 15, 15, -15, 0.1, 80]} />
      </directionalLight>
      
      {/* Vibrant Spotlights */}
      <pointLight position={[5, 5, 5]} intensity={3} color="#06b6d4" />
      <pointLight position={[-8, -2, 5]} intensity={2} color="#f43f5e" />

      {/* Moving Clouds in Background */}
      <Cloud position={[10, 4, -8]} speed={0.01} />
      <Cloud position={[0, 6, -12]} speed={0.005} />
      <Cloud position={[-15, 3, -10]} speed={0.015} />
      <Cloud position={[5, 7, -15]} speed={0.008} />

      {/* Procedural Grid Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow ref={floorRef}>
        <planeGeometry args={[100, 40]} />
        <meshStandardMaterial 
            color="#ffffff"
            map={gridTexture}
            roughness={0.05}
            metalness={0.6}
            transparent
            opacity={0.9}
        />
      </mesh>

      <ContactShadows 
         position={[0, -4.95, 0]} 
         opacity={0.6} 
         scale={30} 
         blur={2.5} 
         far={15} 
         color="#000000" 
      />
    </>
  );
}
