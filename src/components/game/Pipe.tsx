"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface PipeProps {
  x: number;
  gapY: number;
  gapSize?: number;
}

export function Pipe({ x, gapY, gapSize = 2.5 }: PipeProps) {
  const pipeGeometry = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 10, 32), []);
  const pipeMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: "#2ecc71",
    roughness: 0.4,
    metalness: 0.3
  }), []);

  return (
    <group position={[x, 0, 0]}>
      {/* Top Pipe */}
      <mesh 
        geometry={pipeGeometry} 
        material={pipeMaterial} 
        position={[0, gapY + gapSize / 2 + 5, 0]} 
        castShadow 
        receiveShadow
      />
      
      {/* Top Cap */}
      <mesh position={[0, gapY + gapSize / 2 + 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.4, 32]} />
        <meshStandardMaterial color="#27ae60" />
      </mesh>

      {/* Bottom Pipe */}
      <mesh 
        geometry={pipeGeometry} 
        material={pipeMaterial} 
        position={[0, gapY - gapSize / 2 - 5, 0]} 
        castShadow 
        receiveShadow
      />
      
      {/* Bottom Cap */}
      <mesh position={[0, gapY - gapSize / 2 - 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.4, 32]} />
        <meshStandardMaterial color="#27ae60" />
      </mesh>
    </group>
  );
}
