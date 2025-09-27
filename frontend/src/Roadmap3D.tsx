import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Html,
  Environment,
  Float,
  Sphere,
  Cylinder,
  MeshDistortMaterial,
  Stars,
  Trail,
} from "@react-three/drei";
import { FaCrown, FaFlag, FaStar } from "react-icons/fa";
import { animated, useSpring } from "@react-spring/three";
import * as THREE from "three";

interface Roadmap3DProps {
  totalHurdles: number;
  currentHurdle: number;
}

// Enhanced path generation with elevation and curves
function generateEnhancedPath(total: number) {
  const nodes = [];
  const radius = 8;
  for (let i = 0; i < total; i++) {
    const progress = i / (total - 1);
    const angle = progress * Math.PI * 3 + Math.sin(i * 0.5) * 0.3;
    const elevation =
      Math.sin(progress * Math.PI * 2) * 2 + Math.cos(i * 0.8) * 0.5;

    const x = Math.cos(angle) * radius * (1 - progress * 0.3);
    const y = elevation;
    const z = Math.sin(angle) * radius * (1 - progress * 0.3) - progress * 5;

    nodes.push([x, y, z]);
  }
  return nodes;
}

// Animated 3D character with personality
function EnhancedCharacter({ isMoving }: { isMoving: boolean }) {
  const characterRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (characterRef.current) {
      // Breathing animation
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      characterRef.current.scale.y = breathe;

      // Bounce when moving
      if (isMoving) {
        characterRef.current.position.y +=
          Math.sin(state.clock.elapsedTime * 8) * 0.1;
      }

      // Slight rotation
      characterRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <group ref={characterRef}>
      {/* Body */}
      <Sphere args={[0.4, 32, 32]} position={[0, 0.4, 0]}>
        <meshStandardMaterial color="#1976d2" metalness={0.2} roughness={0.3} />
      </Sphere>

      {/* Head */}
      <Sphere args={[0.25, 32, 32]} position={[0, 0.9, 0]}>
        <meshStandardMaterial color="#ffeb3b" metalness={0.1} roughness={0.2} />
      </Sphere>

      {/* Eyes */}
      <Sphere args={[0.03, 16, 16]} position={[-0.08, 0.95, 0.2]}>
        <meshStandardMaterial color="#000" />
      </Sphere>
      <Sphere args={[0.03, 16, 16]} position={[0.08, 0.95, 0.2]}>
        <meshStandardMaterial color="#000" />
      </Sphere>

      {/* Hat */}
      <Cylinder args={[0.15, 0.2, 0.1, 16]} position={[0, 1.15, 0]}>
        <meshStandardMaterial color="#4caf50" />
      </Cylinder>

      {/* Graduation cap top */}
      <mesh position={[0, 1.25, 0]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.4, 0.02, 0.4]} />
        <meshStandardMaterial color="#2196f3" />
      </mesh>

      {/* Trail effect */}
      <Trail width={0.5} length={6} color="#4fc3f7" attenuation={(t) => t * t}>
        <mesh position={[0, 0.4, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#4fc3f7" transparent opacity={0.6} />
        </mesh>
      </Trail>
    </group>
  );
}

// Enhanced hurdle nodes with different types
function HurdleNode({
  position,
  index,
  isCompleted,
  isCurrent,
  isBoss,
  isActive,
}: {
  position: [number, number, number];
  index: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isBoss: boolean;
  isActive: boolean;
}) {
  const nodeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (nodeRef.current) {
      // Pulse animation for current node
      if (isCurrent) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
        nodeRef.current.scale.setScalar(pulse);
      }

      // Gentle rotation for all nodes
      nodeRef.current.rotation.y = state.clock.elapsedTime * 0.5;

      // Float animation
      nodeRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 2 + index) * 0.1;
    }
  });

  const getNodeColor = () => {
    if (isCompleted) return "#4caf50";
    if (isCurrent) return "#ff9800";
    if (isBoss) return "#ffd700";
    return isActive ? "#2196f3" : "#666";
  };

  const getNodeSize = () => {
    return isBoss ? 0.4 : 0.3;
  };

  return (
    <group ref={nodeRef} position={position}>
      {/* Main node */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
        {isBoss ? (
          // Boss node - castle-like structure
          <group>
            <Cylinder args={[0.4, 0.5, 0.8, 8]} position={[0, 0, 0]}>
              <MeshDistortMaterial
                color={getNodeColor()}
                distort={0.2}
                speed={2}
                metalness={0.3}
                roughness={0.2}
              />
            </Cylinder>
            {/* Castle spires */}
            <Cylinder args={[0.1, 0.1, 0.4, 6]} position={[0, 0.6, 0]}>
              <meshStandardMaterial color="#ffd700" />
            </Cylinder>
          </group>
        ) : (
          // Regular node
          <Sphere args={[getNodeSize(), 32, 32]}>
            <MeshDistortMaterial
              color={getNodeColor()}
              distort={0.1}
              speed={1}
              metalness={0.2}
              roughness={0.3}
            />
          </Sphere>
        )}
      </Float>

      {/* Node label */}
      <Html center position={[0, -0.8, 0]} style={{ pointerEvents: "none" }}>
        <div
          style={{
            color: "white",
            fontSize: "14px",
            fontWeight: "bold",
            textAlign: "center",
            textShadow: "0 2px 4px rgba(0,0,0,0.8)",
            background: isCompleted
              ? "rgba(76, 175, 80, 0.8)"
              : isCurrent
              ? "rgba(255, 152, 0, 0.8)"
              : "rgba(0, 0, 0, 0.6)",
            padding: "4px 8px",
            borderRadius: "12px",
            backdropFilter: "blur(4px)",
          }}
        >
          {isBoss ? (
            <FaCrown size={16} />
          ) : isCompleted ? (
            <FaStar size={16} />
          ) : (
            index + 1
          )}
        </div>
      </Html>

      {/* Completion particles */}
      {isCompleted && (
        <group>
          {[...Array(8)].map((_, i) => (
            <Float key={i} speed={3} rotationIntensity={1} floatIntensity={0.8}>
              <mesh
                position={[
                  Math.cos((i * Math.PI) / 4) * 0.8,
                  Math.sin((i * Math.PI) / 4) * 0.8,
                  0,
                ]}
              >
                <sphereGeometry args={[0.02]} />
                <meshBasicMaterial color="#ffeb3b" />
              </mesh>
            </Float>
          ))}
        </group>
      )}
    </group>
  );
}

// Animated path with glowing effect
function AnimatedPath({
  nodes,
  currentHurdle,
}: {
  nodes: number[][];
  currentHurdle: number;
}) {
  const pathRef = useRef<THREE.Line>(null);

  useFrame((state) => {
    if (pathRef.current) {
      // Animate path opacity based on progress
      const material = pathRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  // Create path geometry using THREE.BufferGeometry
  const pathGeometry = useMemo(() => {
    const points = [];
    for (let i = 0; i <= currentHurdle && i < nodes.length - 1; i++) {
      const current = nodes[i];
      const next = nodes[i + 1];

      // Add intermediate points for smooth curves
      for (let t = 0; t <= 1; t += 0.1) {
        const x = current[0] + (next[0] - current[0]) * t;
        const y =
          current[1] + (next[1] - current[1]) * t + Math.sin(t * Math.PI) * 0.2;
        const z = current[2] + (next[2] - current[2]) * t;
        points.push(new THREE.Vector3(x, y, z));
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [nodes, currentHurdle]);

  return (
    <primitive
      ref={pathRef}
      object={
        new THREE.Line(
          pathGeometry,
          new THREE.LineBasicMaterial({
            color: "#4fc3f7",
            transparent: true,
            opacity: 0.8,
          })
        )
      }
    />
  );
}

export default function Roadmap3D({
  totalHurdles,
  currentHurdle,
}: Roadmap3DProps) {
  const nodes = useMemo(
    () => generateEnhancedPath(totalHurdles),
    [totalHurdles]
  );
  const [prevHurdle, setPrevHurdle] = React.useState(currentHurdle);
  const isMoving = currentHurdle !== prevHurdle;

  React.useEffect(() => {
    if (currentHurdle !== prevHurdle) {
      const timer = setTimeout(() => setPrevHurdle(currentHurdle), 1000);
      return () => clearTimeout(timer);
    }
  }, [currentHurdle, prevHurdle]);

  // Animate character position with smooth transitions
  const target = nodes[Math.min(currentHurdle, nodes.length - 1)] || [0, 0, 0];
  const { pos } = useSpring({
    pos: target,
    config: { mass: 1, tension: 80, friction: 20 },
  });

  return (
    <div
      style={{
        width: "100%",
        height: 400,
        background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
        borderRadius: 20,
        margin: "24px 0",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
      }}
    >
      <Canvas camera={{ position: [0, 8, 15], fov: 60 }} shadows>
        {/* Enhanced lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, 5, -10]} intensity={0.3} color="#ff6b6b" />
        <pointLight position={[10, 5, 10]} intensity={0.3} color="#4ecdc4" />

        {/* Environment and atmosphere */}
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

        {/* Animated path */}
        <AnimatedPath nodes={nodes} currentHurdle={currentHurdle} />

        {/* Hurdle nodes */}
        {nodes.map((position, idx) => (
          <HurdleNode
            key={idx}
            position={position as [number, number, number]}
            index={idx}
            isCompleted={idx < currentHurdle}
            isCurrent={idx === currentHurdle}
            isBoss={idx % 5 === 4}
            isActive={idx <= currentHurdle}
          />
        ))}

        {/* Animated character */}
        <animated.group position={pos as any}>
          <EnhancedCharacter isMoving={isMoving} />
        </animated.group>

        {/* Finish flag */}
        {currentHurdle >= totalHurdles - 1 && (
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.8}>
            <group
              position={
                [...nodes[totalHurdles - 1], 2] as [number, number, number]
              }
            >
              <Cylinder args={[0.05, 0.05, 3]} position={[0, 1.5, 0]}>
                <meshStandardMaterial color="#8bc34a" />
              </Cylinder>
              <mesh position={[0.5, 2.5, 0]}>
                <planeGeometry args={[1, 0.6]} />
                <meshStandardMaterial color="#4caf50" side={THREE.DoubleSide} />
              </mesh>
              <Html
                center
                position={[0, 3.5, 0]}
                style={{ pointerEvents: "none" }}
              >
                <div
                  style={{
                    color: "white",
                    fontSize: "20px",
                    fontWeight: "bold",
                    textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                  }}
                >
                  🎉 FINISH! 🎉
                </div>
              </Html>
            </group>
          </Float>
        )}

        {/* Camera controls */}
        <OrbitControls
          enableZoom={true}
          enablePan={true}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 6}
          autoRotate
          autoRotateSpeed={0.3}
          maxDistance={25}
          minDistance={8}
        />
      </Canvas>

      {/* Progress overlay */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          background: "rgba(0, 0, 0, 0.7)",
          color: "white",
          padding: "12px 16px",
          borderRadius: "12px",
          backdropFilter: "blur(10px)",
          fontSize: "14px",
          fontWeight: "bold",
        }}
      >
        Progress: {currentHurdle} / {totalHurdles}
        {currentHurdle < totalHurdles
          ? ` (${Math.round((currentHurdle / totalHurdles) * 100)}%)`
          : " Complete! 🎉"}
      </div>
    </div>
  );
}
