import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useMemo } from "react";
import { FaCrown } from "react-icons/fa";
import { animated, useSpring } from "@react-spring/three";

interface Roadmap3DProps {
  totalHurdles: number;
  currentHurdle: number;
}

// Helper to generate positions for nodes along a winding path
function generatePath(total: number) {
  const nodes = [];
  const radius = 5;
  for (let i = 0; i < total; i++) {
    const angle = (i / total) * Math.PI * 2 * 0.7 + Math.sin(i) * 0.2;
    const x = Math.cos(angle) * radius + (i % 2 === 0 ? 0.5 : -0.5);
    const y = Math.sin(angle) * radius * 0.5 + (i % 3 === 0 ? 0.3 : -0.3);
    nodes.push([x, y, 0]);
  }
  return nodes;
}

// Simple 3D character: a sphere with a face (Html overlay)
function Character() {
  return (
    <>
      <mesh>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#1976d2" />
      </mesh>
      <Html center position={[0, 0.45, 0]} style={{ pointerEvents: "none" }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            textShadow: "0 1px 4px #1976d2",
          }}
        >
          😊
        </div>
      </Html>
    </>
  );
}

export default function Roadmap3D({
  totalHurdles,
  currentHurdle,
}: Roadmap3DProps) {
  const nodes = useMemo(() => generatePath(totalHurdles), [totalHurdles]);

  // Animate character position
  const target = nodes[currentHurdle] || [0, 0, 0];
  const { pos } = useSpring({
    pos: target,
    config: { mass: 1, tension: 120, friction: 18 },
  });

  return (
    <div
      style={{
        width: "100%",
        height: 300,
        background: "#eaf6ff",
        borderRadius: 16,
        margin: "24px 0",
      }}
    >
      <Canvas camera={{ position: [0, 0, 12], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 5]} intensity={0.5} />
        {/* Path line */}
        <mesh>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={nodes.length}
                array={new Float32Array(nodes.flat())}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#4fc3f7" linewidth={4} />
          </line>
        </mesh>
        {/* Nodes */}
        {nodes.map(([x, y, z], idx) => (
          <mesh key={idx} position={[x, y, z]}>
            <sphereGeometry args={[0.25, 32, 32]} />
            <meshStandardMaterial
              color={idx % 5 === 4 ? "#ffd700" : "#81c784"}
            />
            {/* Boss node crown */}
            {idx % 5 === 4 && (
              <Html
                center
                position={[0, 0.5, 0]}
                style={{ pointerEvents: "none" }}
              >
                <FaCrown color="#ffd700" size={20} />
              </Html>
            )}
          </mesh>
        ))}
        {/* Animated character */}
        <animated.group position={pos as any}>
          <Character />
        </animated.group>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  );
}
