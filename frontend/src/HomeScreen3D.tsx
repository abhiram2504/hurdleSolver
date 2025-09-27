import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Text,
  Float,
  Sphere,
  Box,
  Torus,
  MeshDistortMaterial,
  Environment,
  PerspectiveCamera,
  Stars,
} from "@react-three/drei";
import * as THREE from "three";

interface HomeScreen3DProps {
  onUploadClick: () => void;
}

// Floating geometric shapes
function FloatingShape({
  position,
  color,
  shape,
}: {
  position: [number, number, number];
  color: string;
  shape: "sphere" | "box" | "torus";
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.3;
      meshRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
      meshRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.5;
    }
  });

  const ShapeComponent = {
    sphere: () => (
      <Sphere ref={meshRef} position={position} args={[1, 32, 32]}>
        <MeshDistortMaterial color={color} distort={0.3} speed={2} />
      </Sphere>
    ),
    box: () => (
      <Box ref={meshRef} position={position} args={[1.5, 1.5, 1.5]}>
        <MeshDistortMaterial color={color} distort={0.2} speed={1.5} />
      </Box>
    ),
    torus: () => (
      <Torus ref={meshRef} position={position} args={[1, 0.4, 16, 100]}>
        <MeshDistortMaterial color={color} distort={0.4} speed={1} />
      </Torus>
    ),
  };

  return (
    <Float speed={1.5} rotationIntensity={0.5}>
      {ShapeComponent[shape]()}
    </Float>
  );
}

// Animated title text
function AnimatedTitle() {
  const textRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (textRef.current) {
      textRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={textRef} position={[0, 2, 0]}>
      <Text
        fontSize={1.2}
        maxWidth={200}
        lineHeight={1}
        letterSpacing={0.02}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0]}
      >
        HurdleReader
        <meshStandardMaterial color="#4fc3f7" metalness={0.5} roughness={0.2} />
      </Text>
    </group>
  );
}

// Floating particles system
function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  const [positions] = useState(() => {
    const positions = new Float32Array(1000 * 3);
    for (let i = 0; i < 1000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return positions;
  });

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#ffffff" transparent opacity={0.6} />
    </points>
  );
}

// Interactive upload button
function UploadButton({ onClick }: { onClick: () => void }) {
  const buttonRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (buttonRef.current) {
      buttonRef.current.scale.setScalar(hovered ? 1.1 : 1);
      buttonRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group
      ref={buttonRef}
      position={[0, -2, 0]}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <Box args={[3, 1, 0.3]}>
        <meshStandardMaterial
          color={hovered ? "#ff6b6b" : "#4fc3f7"}
          metalness={0.3}
          roughness={0.4}
        />
      </Box>
      <Text
        fontSize={0.25}
        maxWidth={200}
        lineHeight={1}
        letterSpacing={0.02}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        position={[0, -0.15, 0.2]}
      >
        Wanna upload a pdf?
        <meshStandardMaterial color="white" />
      </Text>
    </group>
  );
}

// Camera controller for smooth animations
function CameraController() {
  useFrame((state) => {
    state.camera.position.x = Math.sin(state.clock.elapsedTime * 0.2) * 2;
    state.camera.position.z = 10 + Math.cos(state.clock.elapsedTime * 0.2) * 2;
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function HomeScreen3D({ onUploadClick }: HomeScreen3DProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
        zIndex: 1000,
      }}
    >
      <Canvas shadows style={{ width: "100%", height: "100%" }}>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} />

        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />
        <pointLight
          position={[-10, -10, -10]}
          intensity={0.8}
          color="#ff6b6b"
        />

        {/* Environment */}
        <Environment preset="night" />
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />

        {/* Particle field */}
        <ParticleField />

        {/* Floating shapes */}
        <FloatingShape position={[-5, 3, -2]} color="#ff6b6b" shape="sphere" />
        <FloatingShape position={[5, 1, -3]} color="#4ecdc4" shape="box" />
        <FloatingShape position={[-3, -1, 2]} color="#ffd700" shape="torus" />
        <FloatingShape position={[4, -3, 1]} color="#ff8e8e" shape="sphere" />
        <FloatingShape position={[0, 4, -4]} color="#a8e6cf" shape="box" />

        {/* Main content */}
        <AnimatedTitle />
        <UploadButton onClick={onUploadClick} />

        {/* Subtitle */}
        <Text
          fontSize={0.4}
          maxWidth={200}
          lineHeight={1}
          letterSpacing={0.02}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          position={[0, 0.5, 0]}
        >
          Gamified Learning from PDFs
          <meshStandardMaterial color="#ffffff" transparent opacity={0.8} />
        </Text>

        {/* Camera controls */}
        <CameraController />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>

      {/* Overlay UI */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          color: "white",
          fontSize: "18px",
          fontWeight: "bold",
          textShadow: "0 2px 4px rgba(0,0,0,0.5)",
        }}
      >
        🎮 Turn any PDF into a learning adventure
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          color: "white",
          fontSize: "14px",
          opacity: 0.7,
        }}
      >
        Drag to explore • Click shapes to interact
      </div>
    </div>
  );
}
