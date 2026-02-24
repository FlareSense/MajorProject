import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';

function Zone({ position, name, status, color }) {
    // Make the box pulse/bounce if it's in evacuation mode or high severity
    const meshRef = useRef();

    useFrame((state) => {
        if (!meshRef.current) return;
        if (status?.evacuation_needed || status?.severity === "High") {
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 6) * 0.15;
        } else {
            meshRef.current.position.y = position[1];
        }
    });

    return (
        <group position={position}>
            {/* The Room Box */}
            <mesh ref={meshRef} receiveShadow castShadow>
                <boxGeometry args={[4.5, 1, 4.5]} />
                <meshStandardMaterial
                    color={color}
                    transparent
                    opacity={0.8}
                    roughness={0.2}
                    metalness={0.8}
                />
            </mesh>

            {/* Room Name Label */}
            <Text position={[0, 1.2, 0]} fontSize={0.4} color="white" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">
                {name}
            </Text>

            {/* Alert Status Overlays */}
            {status?.detected && (
                <Text
                    position={[0, 2.0, 0]}
                    fontSize={0.5}
                    color={status.evacuation_needed ? "#ff00ff" : "#ff4d4d"}
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.05} outlineColor="#fff"
                >
                    {status.evacuation_needed ? "🚨 EVACUATE 🚨" : "🔥 FIRE 🔥"}
                </Text>
            )}
        </group>
    );
}

const SpatialMap = ({ systemStatus, cameras }) => {
    // Determine the color of each zone dynamically based on live data
    const getZoneColor = (camId) => {
        const stat = systemStatus[camId];
        if (!stat) return "#444444"; // Loading/Offline
        if (stat.evacuation_needed) return "#ff00ff"; // Critical Magenta
        if (stat.severity === "High") return "#ff4d4d"; // Red
        if (stat.detected) return "#ffa500"; // Orange
        return "#11aa11"; // Safe Green
    };

    return (
        <div style={{ width: '100%', height: '70vh', minHeight: '500px', backgroundColor: '#090909', borderRadius: '15px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px' }}>
                <h3 style={{ margin: 0 }}>Digital Twin Surveillance</h3>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#aaa' }}>Drag to rotate • Scroll to zoom</p>
            </div>

            <Canvas shadows camera={{ position: [0, 10, 10], fov: 45 }}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
                <directionalLight position={[-10, 10, -5]} intensity={0.5} />

                {/* Building Floor Base */}
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
                    <planeGeometry args={[15, 10]} />
                    <meshStandardMaterial color="#2d2d2d" roughness={0.8} />
                </mesh>

                {/* Specific Monitoring Zones (mapped to our cameras) */}
                <Zone
                    position={[-3, 0, 0]}
                    name={cameras["cam_0"]?.name || "Kitchen Zone"}
                    status={systemStatus["cam_0"]}
                    color={getZoneColor("cam_0")}
                />

                <Zone
                    position={[3, 0, 0]}
                    name={cameras["cam_1"]?.name || "Local Webcam Area"}
                    status={systemStatus["cam_1"]}
                    color={getZoneColor("cam_1")}
                />

                <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2 - 0.1} />
            </Canvas>
        </div>
    );
};

export default SpatialMap;
