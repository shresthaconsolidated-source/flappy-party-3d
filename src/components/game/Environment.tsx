"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sky, useTexture } from "@react-three/drei";
import * as THREE from "three";

export function Environment() {
  const floorRef = useRef<THREE.Mesh>(null);
  const gridTexture = useTexture('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/grid.png');
  
  if (gridTexture) {
    gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(10, 10);
  }

  useFrame((state) => {
    if (floorRef.current) {
        // Move floor texture to simulate movement
        const material = floorRef.current.material as THREE.MeshStandardMaterial;
        if (material.map) {
            material.map.offset.x = state.clock.elapsedTime * 0.06;
        }
    }
  });

  return (
    <>
      <Sky sunPosition={[100, 20, 100]} />
      
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Moving Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow ref={floorRef}>
        <planeGeometry args={[100, 20]} />
        <meshStandardMaterial 
            color="#8b4513" 
            map={new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/grid.png')}
        />
      </mesh>
    </>
  );
}
