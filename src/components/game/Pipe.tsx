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
  
  const pipeMaterial = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 128, 0);
        grad.addColorStop(0, '#16a34a');
        grad.addColorStop(0.5, '#4ade80');
        grad.addColorStop(1, '#16a34a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);
    }
    const tex = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({ 
      map: tex,
      roughness: 0.1,
      metalness: 0.8,
      emissive: "#059669",
      emissiveIntensity: 0.2
    });
  }, []);

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
