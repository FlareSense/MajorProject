import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html, Box as Cube, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { Flame, Users, AlertOctagon, CheckCircle2 } from 'lucide-react';

// --- STYLING CONSTANTS ---
const COLORS = {
    SAFE: '#00ff41',
    WARNING: '#ff9d00',
    CRITICAL: '#ff1100',
    EVACUATE: '#ff00ff',
    GRID: '#0d2238'
};

function LiveVideoScreen({ camId, position, rotY, isLive }) {
    // Premium Feature: Project the actual server MJPEG stream onto a 3D Plane Geometry!
    return (
        <group position={position} rotation={[0, rotY, 0]}>
            <mesh position={[0, 1.8, 0]}>
                <planeGeometry args={[3.2, 2.4]} />
                {isLive ? (
                    // In a true environment we'd use CanvasTexture with a hidden HTMLVideoElement, 
                    // but for MJPEG streams over HTTP in R3F, creating a custom glowing material is safer.
                    <meshBasicMaterial
                        color="#ffffff"
                        transparent
                        opacity={0.8}
                        map={new THREE.TextureLoader().load(`http://localhost:5000/video_feed/${camId}`)}
                    />
                ) : (
                    <meshStandardMaterial color="#222" transparent opacity={0.6} />
                )}
            </mesh>
            {/* Holographic glowing screen border */}
            <mesh position={[0, 1.8, -0.01]}>
                <planeGeometry args={[3.3, 2.5]} />
                <meshBasicMaterial color="#00e5ff" wireframe opacity={0.3} transparent />
            </mesh>
        </group>
    );
}

function HolographicUI({ status, name }) {
    // Determine exact state
    const isEvac = status?.evacuation_needed;
    const isFire = status?.severity === "High";
    const isSafe = !status?.detected;

    let mainColor = COLORS.SAFE;
    if (isFire) mainColor = COLORS.CRITICAL;
    if (isEvac) mainColor = COLORS.EVACUATE;
    if (status?.detected && !isFire && !isEvac) mainColor = COLORS.WARNING;

    return (
        <Html transform wrapperClass="holo-ui-wrapper" distanceFactor={14} position={[0, 4.2, 0]} zIndexRange={[100, 0]}>
            <div style={{
                background: `linear-gradient(135deg, rgba(10,10,15,0.85) 0%, rgba(20,20,30,0.65) 100%)`,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${mainColor}`,
                boxShadow: `0 0 25px ${mainColor}44`,
                borderRadius: '12px',
                padding: '18px',
                color: 'white',
                width: '320px', // Wider to fit more cleanly
                fontFamily: 'Inter, sans-serif',
                pointerEvents: 'none',
                opacity: 0.95,
                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' // Cyberpunk corner cut
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${mainColor}66`, paddingBottom: '12px', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{name}</h3>
                    {isSafe ? <CheckCircle2 color={mainColor} size={28} /> : (isEvac ? <AlertOctagon color={mainColor} size={28} /> : <Flame color={mainColor} size={28} />)}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '1rem' }}>
                    <div>
                        <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', letterSpacing: '1px' }}>THREAT LEVEL</span>
                        <strong style={{ color: mainColor, textShadow: `0 0 8px ${mainColor}`, fontSize: '1.2rem' }}>
                            {isEvac ? 'EVACUATE' : (status?.severity || 'SECURE')}
                        </strong>
                    </div>
                    <div>
                        <span style={{ color: '#888', display: 'block', fontSize: '0.75rem', letterSpacing: '1px' }}>AI CONFIDENCE</span>
                        <strong style={{ fontSize: '1.2rem' }}>{status?.confidence ? `${(status.confidence * 100).toFixed(1)}%` : '--'}</strong>
                    </div>
                </div>

                <div style={{ marginTop: '18px', background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: `2px solid #00e5ff` }}>
                    <Users size={18} color="#00e5ff" />
                    <span style={{ fontSize: '1.05rem' }}>Occupancy Tracking:</span>
                    <strong style={{ fontSize: '1.4rem', color: '#00e5ff', marginLeft: 'auto' }}>{status?.person_count || 0}</strong>
                </div>

                {/* Animated Scanner Bar CSS injected */}
                {!isSafe && (
                    <div style={{ height: '3px', background: mainColor, marginTop: '18px', width: '100%', borderRadius: '2px', animation: 'pulse 1s infinite alternate' }} />
                )}
            </div>
        </Html>
    );
}

function CyberpunkZone({ position, rotation = [0, 0, 0], name, status, camId, isActive }) {
    const groupRef = useRef();
    const glowRef = useRef();

    const isEvac = status?.evacuation_needed;
    const isFire = status?.severity === "High";
    const isWarning = status?.detected && !isFire && !isEvac;

    let baseColor = COLORS.SAFE;
    if (isFire) baseColor = COLORS.CRITICAL;
    if (isEvac) baseColor = COLORS.EVACUATE;
    if (isWarning) baseColor = COLORS.WARNING;

    // Pulse animation for critical thresholds
    useFrame(({ clock }) => {
        if (!glowRef.current) return;
        if (isFire || isEvac) {
            const intensity = 0.5 + Math.sin(clock.elapsedTime * (isEvac ? 10 : 5)) * 0.5;
            glowRef.current.opacity = intensity * 0.8;
            glowRef.current.scale.setScalar(1 + intensity * 0.1);
        } else {
            glowRef.current.opacity = 0.1;
            glowRef.current.scale.setScalar(1);
        }
    });

    return (
        <group position={position} rotation={rotation} ref={groupRef}>
            {/* The Cyberpunk Glass Floor Area */}
            <Cube args={[5, 0.2, 5]} position={[0, -0.1, 0]}>
                <meshPhysicalMaterial
                    color={baseColor}
                    transmission={0.9}
                    opacity={0.8}
                    transparent
                    roughness={0.1}
                    thickness={2}
                    emissive={baseColor}
                    emissiveIntensity={0.2}
                />
            </Cube>

            {/* Neon Edges */}
            <lineSegments position={[0, -0.1, 0]}>
                <edgesGeometry args={[new THREE.BoxGeometry(5, 0.2, 5)]} />
                <lineBasicMaterial color={baseColor} linewidth={2} />
            </lineSegments>

            {/* Volumetric Threat Glow (sphere that expands when fire detected) */}
            <Sphere ref={glowRef} args={[2.5, 32, 32]} position={[0, 1.5, 0]}>
                <meshBasicMaterial
                    color={baseColor}
                    transparent
                    opacity={0.1}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </Sphere>

            {/* The 3D Video Feed Screen */}
            <LiveVideoScreen camId={camId} position={[0, 0, -2.4]} rotY={0} isLive={isActive} />

            {/* UI Hologram floating in space */}
            <HolographicUI status={status} name={name} />
        </group>
    );
}

const SpatialMap = ({ systemStatus, cameras }) => {
    return (
        <div style={{ width: '100%', height: '70vh', minHeight: '600px', backgroundColor: '#050a10', borderRadius: '15px', overflow: 'hidden', position: 'relative', border: '1px solid #1a3a5c', boxShadow: '0 0 30px rgba(0,229,255,0.1)' }}>

            {/* 2D Overlay Header */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#00e5ff', boxShadow: '0 0 10px #00e5ff', animation: 'pulse 2s infinite' }} />
                    <h2 style={{ margin: 0, fontFamily: 'monospace', fontSize: '1.5rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#00e5ff' }}>Command Center</h2>
                </div>
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#688ca8', fontFamily: 'monospace' }}>DIGITAL TWIN [SECTOR-A] • ORBIT CONTROL ACTIVE</p>
            </div>

            <Canvas shadows camera={{ position: [0, 10, 18], fov: 55 }}>
                {/* Visual Environment */}
                <color attach="background" args={['#050a10']} />
                <fog attach="fog" args={['#050a10', 10, 60]} />
                <ambientLight intensity={0.5} color="#ffffff" />
                <directionalLight position={[10, 20, 10]} intensity={1.5} color="#00e5ff" castShadow />
                {/* Core facility light */}
                <pointLight position={[0, 15, 0]} intensity={2.5} color="#ffffff" distance={40} />

                {/* Radar Horizon Grid - Expanded */}
                <gridHelper args={[100, 100, COLORS.GRID, COLORS.GRID]} position={[0, -0.2, 0]} />

                {/* Sector A: Positioned left and angled inwards */}
                <CyberpunkZone
                    position={[-7.5, 0, -2]}
                    rotation={[0, Math.PI / 8, 0]}
                    name={cameras["cam_0"]?.name || "Kitchen Sector"}
                    status={systemStatus["cam_0"]}
                    camId={"cam_0"}
                    isActive={systemStatus["cam_0"]?.camera_active !== false}
                />

                {/* Sector B: Positioned right and angled inwards */}
                <CyberpunkZone
                    position={[7.5, 0, -2]}
                    rotation={[0, -Math.PI / 8, 0]}
                    name={cameras["cam_1"]?.name || "Main Entry Sector"}
                    status={systemStatus["cam_1"]}
                    camId={"cam_1"}
                    isActive={systemStatus["cam_1"]?.camera_active !== false}
                />

                {/* Camera Control: Allow panning, limit vertical angle so you don't go under floor */}
                <OrbitControls
                    makeDefault
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 2 - 0.05}
                    minDistance={5}
                    maxDistance={25}
                    enableDamping
                    dampingFactor={0.05}
                />
            </Canvas>
        </div>
    );
};

export default SpatialMap;
