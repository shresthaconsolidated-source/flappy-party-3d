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
        {/* Procedural Fluffy Cloud using spheres */}
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

export function Environment() {
  const floorRef = useRef<THREE.Mesh>(null);
  
  // Day/Night Cycle State
  const bgColor = useRef(new THREE.Color('#7dd3fc'));
  const fogColor = useRef(new THREE.Color('#bae6fd'));

  // Create a procedural grid texture
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
    // Scroll floor
    if (floorRef.current) {
        const material = floorRef.current.material as THREE.MeshStandardMaterial;
        if (material.map) {
            material.map.offset.x += 0.005;
        }
    }

    // Smooth Day/Night Cycle (Cycles every 120 seconds)
    const cycle = (state.clock.elapsedTime % 120) / 120; // 0 to 1
    const isNight = cycle > 0.5;
    const intensity = isNight ? Math.sin((cycle - 0.5) * Math.PI) : 0;
    
    // Lerp background and fog
    // Day: #7dd3fc, Night: #0f172a
    bgColor.current.lerpColors(new THREE.Color('#7dd3fc'), new THREE.Color('#0f172a'), Math.sin(cycle * Math.PI));
    fogColor.current.lerpColors(new THREE.Color('#bae6fd'), new THREE.Color('#1e293b'), Math.sin(cycle * Math.PI));
  });

  return (
    <>
      <color attach="background" args={[bgColor.current.getHex()]} />
      <fog attach="fog" args={[fogColor.current.getHex(), 10, 50]} />
      
      {/* Bright Professional Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[30, 40, 20]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      >
        <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20, 0.1, 100]} />
      </directionalLight>
      
      {/* Atmosphere Boosters - Sun/Moon Glow */}
      <pointLight position={[10, 10, -10]} intensity={2} color="#fef08a" />
      <pointLight position={[-15, 5, 10]} intensity={1} color="#bae6fd" />

      {/* Realistic Procedural Clouds */}
      <Cloud position={[15, 8, -15]} speed={0.005} />
      <Cloud position={[0, 10, -20]} speed={0.003} />
      <Cloud position={[-20, 7, -18]} speed={0.006} />
      <Cloud position={[8, 12, -25]} speed={0.004} />
      <Cloud position={[-10, 9, -12]} speed={0.007} />

      {/* Procedural Grid Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow ref={floorRef}>
        <planeGeometry args={[120, 60]} />
        <meshStandardMaterial 
            color="#ffffff"
            map={gridTexture}
            roughness={0.02}
            metalness={0.8}
            transparent
            opacity={0.8}
        />
      </mesh>

      <ContactShadows 
         position={[0, -4.98, 0]} 
         opacity={0.5} 
         scale={40} 
         blur={3} 
         far={20} 
         color="#000000" 
      />
    </>
  );
}
