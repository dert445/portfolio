import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Html, Float, Outlines, useTexture, useProgress, Line } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Target, ArrowDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// Procedural Stars are used instead of static textures

// Fullscreen Loading Overlay
const LoadingScreen = () => {
  const { progress, active } = useProgress();
  const loaderRef = useRef();

  useEffect(() => {
    if (!active && progress === 100) {
      gsap.to(loaderRef.current, {
        opacity: 0,
        duration: 1.5,
        delay: 0.5,
        ease: "power3.inOut",
        onComplete: () => {
           if (loaderRef.current) loaderRef.current.style.display = 'none';
        }
      });
    }
  }, [active, progress]);

  return (
    <div
      ref={loaderRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#010103',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#00ffcc',
        fontFamily: "'Orbitron', sans-serif",
      }}
    >
      <h1 style={{ fontSize: '24px', letterSpacing: '6px', textTransform: 'uppercase', marginBottom: '24px', fontWeight: 700 }}>
        Initializing Cosmos
      </h1>
      <div style={{ width: '300px', height: '2px', background: 'rgba(0, 255, 204, 0.2)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: '#00ffcc', transition: 'width 0.3s ease-out' }} />
      </div>
      <p style={{ marginTop: '16px', fontSize: '14px', letterSpacing: '3px', fontWeight: 700 }}>{Math.round(progress)}%</p>
    </div>
  );
};

// Helper for orbiting Moon
const CelestialMoon = ({ size, distance, textureUrl }) => {
  const moonRef = useRef();
  const colorMap = useTexture(textureUrl);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.4;
    moonRef.current.position.x = Math.cos(t) * distance;
    moonRef.current.position.z = Math.sin(t) * distance;
  });

  return (
    <mesh ref={moonRef} castShadow receiveShadow>
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial map={colorMap} roughness={0.8} />
      <Outlines thickness={0.02} color="#ffffff" transparent opacity={0.3} />
    </mesh>
  );
};

// Helper for Saturn's Ring (Fixed UV Orientation)
const CelestialRing = ({ size, textureUrl }) => {
  const colorMap = useTexture(textureUrl);
  const geoRef = useRef();

  useEffect(() => {
    // Remap RingGeometry UVs so the 1D ring texture wraps radially instead of circularly
    if (geoRef.current) {
      const pos = geoRef.current.attributes.position;
      const v3 = new THREE.Vector3();
      const inner = size * 1.4;
      const outer = size * 2.4;
      for (let i = 0; i < pos.count; i++) {
        v3.fromBufferAttribute(pos, i);
        const radius = v3.length();
        const uvX = (radius - inner) / (outer - inner);
        // Map the texture to project radially over the ring surface
        geoRef.current.attributes.uv.setXY(i, uvX, 1);
      }
      geoRef.current.attributes.uv.needsUpdate = true;
    }
  }, [size]);

  return (
    <mesh rotation={[-Math.PI / 2 + 0.3, 0, 0]} receiveShadow castShadow>
      <ringGeometry ref={geoRef} args={[size * 1.4, size * 2.4, 128]} />
      <meshStandardMaterial map={colorMap} transparent opacity={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
};

// Helper for Venus Clouds
const CelestialAtmosphere = ({ size, textureUrl }) => {
  const colorMap = useTexture(textureUrl);
  const cloudRef = useRef();

  useFrame(() => {
    cloudRef.current.rotation.y += 0.001;
  });

  return (
    <mesh ref={cloudRef}>
      <sphereGeometry args={[size * 1.025, 64, 64]} />
      <meshStandardMaterial 
        map={colorMap} 
        transparent 
        opacity={0.85} 
        depthWrite={false} 
      />
    </mesh>
  );
};

// Small Contact Form Component for Interactive Nodes
const ContactForm = ({ nodeColor }) => {
  const [msg, setMsg] = useState("");
  
  const handleSend = () => {
    if (!msg) return;
    window.location.href = `mailto:debadrito.445@gmail.com?subject=Direct Protocol Transmission&body=${encodeURIComponent(msg)}`;
    setMsg("");
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <textarea 
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="Type encrypted message here..."
        style={{
          width: '100%',
          height: '80px',
          background: 'rgba(0,0,0,0.5)',
          border: `1px solid ${nodeColor}80`,
          borderRadius: '4px',
          color: '#fff',
          padding: '8px',
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '11px',
          resize: 'none',
          marginBottom: '8px',
          outline: 'none',
        }}
        onPointerDown={(e) => e.stopPropagation()} // Prevent closing the planet when clicking
        onKeyDown={(e) => e.stopPropagation()}     // Prevent camera movement from keys
      />
      <button 
        onClick={(e) => { e.stopPropagation(); handleSend(); }}
        style={{
          width: '100%',
          background: 'transparent',
          border: `1px solid ${nodeColor}`,
          borderRadius: '4px',
          color: nodeColor,
          padding: '8px',
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '11px',
          cursor: 'pointer',
          textTransform: 'uppercase',
          fontWeight: 'bold',
          transition: 'all 0.2s',
          letterSpacing: '1px'
        }}
        onMouseEnter={(e) => { e.target.style.background = `${nodeColor}33`; }}
        onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
      >
        SEND DATA
      </button>
    </div>
  );
};

// Expandable Node Expansion System Component
// KEY FIX: We conditionally render <Html> elements ONLY for the active planet.
// drei's <Html> injects real DOM overlays that ignore 3D depth sorting,
// so CSS opacity tricks don't work — the DOM nodes bleed through from distant planets.
const ExpandableNodes = ({ isFocused, nodes, color, title, subtitle, imageUrl, size, isSun, isActive }) => {
  const groupRef = useRef();

  // If this planet is NOT the active one, render absolutely nothing.
  // This is the only reliable way to prevent HTML overlay bleed-through.
  if (!isActive) return null;

  return (
    <group ref={groupRef}>
      {/* Side title + subtitle — only shown when active but NOT focused (clicked) */}
      {!isFocused && (
        <Html distanceFactor={20} position={[size + 2, 0, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            {imageUrl && (
              <img src={imageUrl} alt={title} style={{
                width: '320px',
                height: '180px',
                objectFit: 'cover',
                borderRadius: '6px',
                border: `1px solid ${color}80`,
                boxShadow: `0 8px 24px rgba(0,0,0,0.8), 0 0 15px ${color}40`,
              }} />
            )}
            <div style={{
              color: color,
              fontFamily: "'Orbitron', sans-serif",
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>
              <div style={{
                fontSize: '36px', 
                fontWeight: 900,
                textShadow: `0 0 15px ${color}`,
                background: 'rgba(5,5,10,0.85)',
                padding: '12px 24px',
                borderRadius: '6px',
                border: `1px solid ${color}60`,
                marginBottom: '12px',
                letterSpacing: '2px',
              }}>
                {title}
              </div>
              {subtitle && (
                <div style={{
                  fontSize: '16px',
                  fontWeight: 400,
                  color: '#e0e0e0',
                  textTransform: 'none',
                  whiteSpace: 'normal',
                  maxWidth: '360px',
                  lineHeight: '1.6',
                  fontFamily: "'Orbitron', sans-serif",
                  letterSpacing: '0.5px',
                  background: 'rgba(5,5,10,0.7)',
                  padding: '12px 16px',
                  borderRadius: '4px',
                  borderLeft: `4px solid ${color}`
                }}>
                  {subtitle}
                </div>
              )}
              
              {/* Click instruction CTA, only if there are nodes to show */}
              {nodes && nodes.length > 0 && (
                <div style={{
                  marginTop: '16px',
                  display: 'inline-block',
                  fontSize: '10px',
                  fontWeight: 900,
                  color: '#fff',
                  background: `${color}40`,
                  padding: '6px 12px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '3px',
                  border: `1px solid ${color}`,
                  boxShadow: `0 0 10px ${color}60`,
                  animation: 'pulseAction 1.5s infinite ease-in-out'
                }}>
                  [ Click to Expand Details ]
                </div>
              )}
            </div>
          </div>
        </Html>
      )}

      {/* Expanded nodes — only rendered when planet is clicked (focused) */}
      {isFocused && nodes && nodes.length > 0 && (
        <group>
          {nodes.map((node, i) => {
            const angle = (i / nodes.length) * Math.PI * 2;
            
            // Cap the maximum radius so it never escapes the viewport even for huge planets
            const branchRadius = Math.min(size * 2 + 5, 14); 
            
            let targetX = Math.cos(angle) * branchRadius * 2.0;
            let targetY = Math.sin(angle) * branchRadius * 1.2;
            
            if (nodes.length === 1) { targetX = branchRadius * 1.8; targetY = 0; }
            if (nodes.length === 2) { targetX = (i === 0 ? -1 : 1) * branchRadius * 1.6; targetY = branchRadius * 0.5; }
            
            // Create the cyberpunk bent line (elbow joint)
            // It goes out diagonally to a midpoint, then straight horizontally to the end
            const elbowX = targetX * 0.4;
            const points = [
              [0, 0, 0],
              [elbowX, targetY, 0],
              [targetX, targetY, 0]
            ];
            
            const nodeColor = node.color || color;
            
            return (
              <group key={`expanded-node-${i}`}>
                <Line points={points} color={nodeColor} transparent opacity={0.6} lineWidth={1.5} />
                <Html position={[targetX, targetY, 0]} center zIndexRange={[100, 0]}>
                  <div style={{
                    border: `1px solid ${nodeColor}80`, 
                    borderTop: `3px solid ${nodeColor}`,
                    color: 'white', 
                    fontFamily: "'Orbitron', sans-serif",
                    padding: '24px', 
                    background: 'rgba(5, 5, 12, 0.88)', 
                    backdropFilter: 'blur(12px)',
                    boxShadow: `0 8px 32px rgba(0, 0, 0, 0.8), 0 0 15px ${nodeColor}30`, 
                    width: '320px',
                    pointerEvents: 'auto',
                    animation: `nodeAppear 0.5s ${i * 0.12}s both cubic-bezier(0.175, 0.885, 0.32, 1.275)`
                  }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: nodeColor, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                      {node.title}
                    </h3>
                    {node.image && imageUrl && (
                      <div style={{ marginBottom: '12px', width: '100%', overflow: 'hidden', borderRadius: '4px', border: `1px solid ${nodeColor}50` }}>
                        <img src={imageUrl} alt={node.title} style={{
                          width: '100%',
                          height: '220px',
                          display: 'block',
                          objectFit: 'cover',
                          transition: 'transform 0.3s ease',
                        }} 
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                        />
                      </div>
                    )}
                    {node.desc && <p style={{ margin: 0, fontSize: '12px', color: '#bbb', lineHeight: '1.7', letterSpacing: '0.3px' }}>{node.desc}</p>}
                    
                    {node.isContactForm && <ContactForm nodeColor={nodeColor} />}

                    {node.link && (
                      <a href={node.link} target="_blank" rel="noreferrer" style={{
                        display: 'inline-block',
                        marginTop: '14px',
                        padding: '6px 12px',
                        background: 'transparent',
                        border: `1px solid ${nodeColor}`,
                        color: nodeColor,
                        textDecoration: 'none',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontWeight: 700,
                        letterSpacing: '1px',
                      }}
                      onMouseEnter={(e) => { e.target.style.background = `${nodeColor}33`; }}
                      onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                      >
                        {node.linkText || '[ ACCESS ]'}
                      </a>
                    )}
                  </div>
                </Html>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
};

// Custom Planet Component
const Planet = ({ 
  id, position: posZ, color, title, subtitle, imageUrl, size = 1, textureUrl, 
  isSun, hasRing, ringTextureUrl, hasMoon, moonTextureUrl,
  hasAtmosphere, atmosphereTextureUrl,
  nodes,
  layoutMode, posX, posY,
  focusedPlanetId, setFocusedPlanetId, index, isActive: parentIsActive
}) => {
  const meshRef = useRef();
  const glowRef = useRef();
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const colorMap = useTexture(textureUrl);

  const effectiveIsActive = (layoutMode === 'Z' && parentIsActive) || hovered || (focusedPlanetId === id);

  const orbitRadius = Math.abs(posZ[2]);
  const orbitSpeed = isSun ? 0 : 0.05 + (1 / (index + 1)) * 0.2; 
  const rotationSpeed = 0.2;
  const orbitAngle = useRef(Math.random() * Math.PI * 2);

  useFrame((state, delta) => {
    // 1. Axial Rotation
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed * delta;
    }

    if (!groupRef.current) return;

    // 2. Determine spatial target
    let targetX, targetY, targetZ;
    
    const isFocused = focusedPlanetId === id;
    
    if (layoutMode === 'X') {
      targetX = posX[0]; targetY = posX[1]; targetZ = posX[2];
    } else if (layoutMode === 'Y') {
      targetX = posY[0]; targetY = posY[1]; targetZ = posY[2];
    } else {
      // Z (Voyage Mode): Orbit around Sun
      if (isSun) {
         targetX = 0; targetY = 0; targetZ = 0;
      } else {
         if (!isFocused) {
           orbitAngle.current += orbitSpeed * delta;
         }
         targetX = Math.cos(orbitAngle.current) * orbitRadius;
         targetY = Math.sin(orbitAngle.current * 0.5) * 5; // Slight vertical variance in orbit
         targetZ = Math.sin(orbitAngle.current) * orbitRadius;
      }
    }

    // 3. Cinematic Lerp fly-to
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 2.5 * delta);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 2.5 * delta);
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 2.5 * delta);
  });

  useEffect(() => {
    if (!meshRef.current || !glowRef.current) return;

    // Hover & Focus GSAP Animation
    if (hovered || focusedPlanetId === id) {
      gsap.to(meshRef.current.scale, { x: 1.05, y: 1.05, z: 1.05, duration: 0.6, ease: "back.out(1.5)" });
      gsap.to(glowRef.current.material, { opacity: 0.8, duration: 0.6 });
      gsap.to(glowRef.current.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.6, ease: "sine.out" });
    } else {
      gsap.to(meshRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: "power2.out" });
      gsap.to(glowRef.current.material, { opacity: 0, duration: 0.6 });
      gsap.to(glowRef.current.scale, { x: 1.01, y: 1.01, z: 1.01, duration: 0.6, ease: "power2.out" });
    }
  }, [hovered, focusedPlanetId, id]);

  return (
    <group ref={groupRef} name={`planet-group-${id}`}>
      <Float speed={1.5} rotationIntensity={isSun ? 0 : 2} floatIntensity={isSun ? 0 : 2}>
        <mesh 
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            setFocusedPlanetId(focusedPlanetId === id ? null : id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation(); // Prevents multiple trigger if planets overlap
            setHovered(true);
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setHovered(false);
          }}
        >
          <sphereGeometry args={[size, 64, 64]} />
          
          {/* Sun is unlit vs Planets are lit */}
          {isSun ? (
             <meshBasicMaterial map={colorMap} color="#ffffff" />
          ) : (
             <meshStandardMaterial 
              map={colorMap}
              roughness={0.4} 
              metalness={0.6}
            />
          )}

          {/* Core glow rim */}
          <mesh ref={glowRef}>
            <sphereGeometry args={[size * 1.01, 64, 64]} />
            <meshBasicMaterial 
              color={color} 
              transparent 
              opacity={0} 
              blending={THREE.AdditiveBlending} 
              side={THREE.BackSide} 
            />
          </mesh>
          <Outlines thickness={0.03} color={color} opacity={hovered ? 1 : 0} transparent />
          
          {hasAtmosphere && <CelestialAtmosphere size={size} textureUrl={atmosphereTextureUrl} />}
          {hasRing && <CelestialRing size={size} textureUrl={ringTextureUrl} />}
          {hasMoon && <CelestialMoon size={size * 0.25} distance={size * 1.8} textureUrl={moonTextureUrl} />}
        </mesh>
      </Float>

      <ExpandableNodes 
        isFocused={focusedPlanetId === id}
        nodes={nodes}
        color={color}
        title={title}
        subtitle={subtitle}
        imageUrl={imageUrl}
        size={size}
        isSun={isSun}
        isActive={effectiveIsActive}
      />
    </group>
  );
};

// Controls the Camera Winding Movement linked to Scroll
const CameraController = ({ stops, layoutMode, focusedPlanetId, activeTargetId, setActiveTargetId }) => {
  const { camera } = useThree();
  const currentLookTarget = useRef(new THREE.Vector3(0, 0, -30));

  useEffect(() => {
    // Start camera far back
    camera.position.set(0, 0, 20);

    // Timeline only controls Active Index now
    const st = ScrollTrigger.create({
      trigger: ".scroll-anchor",
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const index = Math.min(
           Math.floor(self.progress * stops.length), 
           stops.length - 1
        );
        setActiveTargetId(stops[index].id);
      }
    });

    return () => st.kill();
  }, [stops, setActiveTargetId]);

  const lookTarget = useRef(new THREE.Vector3());
  const camTargetPos = useRef(new THREE.Vector3());
  const offsetPos = useRef(new THREE.Vector3());

  // Cinematic Engine Tracking loop
  useFrame((state, delta) => {
    const targetId = focusedPlanetId || activeTargetId;
    const targetObj = state.scene.getObjectByName(`planet-group-${targetId}`);
    
    if (!targetObj) return;

    const planetConfig = stops.find(s => s.id === targetId);
    targetObj.getWorldPosition(lookTarget.current);

    if (focusedPlanetId) {
      // Zoom into the planet, but leaving space for the expanded nodes
      offsetPos.current.set(0, planetConfig.size * 0.5, planetConfig.size * 5.0 + 20);
      camTargetPos.current.copy(lookTarget.current).add(offsetPos.current);
    } else {
      if (layoutMode === 'Z') {
         // Voyage tracking mode: trailing the active planet while it orbits
         const angle = Math.atan2(lookTarget.current.z, lookTarget.current.x);
         camTargetPos.current.x = lookTarget.current.x + Math.cos(angle) * (planetConfig.size * 3 + 15);
         camTargetPos.current.z = lookTarget.current.z + Math.sin(angle) * (planetConfig.size * 3 + 15);
         camTargetPos.current.y = lookTarget.current.y + planetConfig.size * 1.5;
         
         // Clean framing for sun
         if (planetConfig.isSun) {
            camTargetPos.current.set(0, 0, 25);
         }
      } else {
         // Gallery or Stack mode global view
         camTargetPos.current.set(0, 0, 150);
         lookTarget.current.set(0, 0, -30);
      }
    }

    // Clamp delta to prevent erratic jumps on lag spikes
    const safeDelta = Math.min(delta, 0.1);

    // Warp smoothly to position
    camera.position.lerp(camTargetPos.current, 3 * safeDelta);

    // Look at target smoothly
    currentLookTarget.current.lerp(lookTarget.current, 4 * safeDelta);
    camera.lookAt(currentLookTarget.current);
  });

  return null;
};

// Targeting Reticle logic
const CustomCursor = () => {
  const cursorRef = useRef(null);

  useEffect(() => {
    // Utilize gsap.quickTo to handle explosive mouse move updates without accumulating tween GC
    const xTo = gsap.quickTo(cursorRef.current, "x", { duration: 0.15, ease: "power3.out" });
    const yTo = gsap.quickTo(cursorRef.current, "y", { duration: 0.15, ease: "power3.out" });

    const onMouseMove = (e) => {
      xTo(e.clientX);
      yTo(e.clientY);
    };

    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  return (
    <div
      ref={cursorRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '48px',
        height: '48px',
        color: '#00ffcc',
        transition: 'transform 0.2s',
      }}
      className="reticle"
    >
      <Target size={36} strokeWidth={1.5} />
    </div>
  );
};


const resumePlanets = [
  { 
    id: "sun", title: "SYSTEM START", subtitle: "Welcome to the cosmic portfolio. Scroll down to explore the universe of my work.", position: [0, 0, 0], color: "#ffcc00", size: 4.5, textureUrl: "/images/2k_sun.jpg", isSun: true,
    nodes: []
  },
  { 
    id: "mercury", title: "INTRODUCTION", subtitle: "Full Stack Developer & Automation Engineer based in West Bengal, India. Click to learn more.",
    position: [0, 0, -80], color: "#00ffcc", size: 1.3, textureUrl: "/images/2k_mercury.jpg",
    nodes: [
      { title: "Role", desc: "Full Stack Developer & Automation Engineer — building high-performance web applications and bridging software systems with physical hardware control. My work lives at the intersection of data pipelines, interactive UIs, and embedded systems.", color: "#00ff33" },
      { title: "Location", desc: "Based in West Bengal, India. Experienced in collaborating globally on cutting-edge technical projects across time zones, with a relentless focus on delivery and quality.", color: "#66ccff" },
      { title: "Mission", desc: "Forging seamless, deeply interactive digital experiences that empower organizations to automate complex tasks, analyze data at scale, and manage hardware remotely with zero friction.", color: "#ff3300" }
    ]
  },
  { 
    id: "venus", title: "SKILL SET", subtitle: "Core technical proficiencies across frontend, backend, and embedded systems. Click to expand.",
    position: [0, 0, -160], color: "#eebb88", size: 1.8, textureUrl: "/images/2k_venus_surface.jpg",
    nodes: [
      { title: "React", desc: "Building immersive, high-performance user interfaces with modern React, Hooks, Context APIs, and advanced performance optimization techniques.", color: "#61dafb" },
      { title: "Python", desc: "Orchestrating automated data pipelines, complex server-side logic, and robust backend infrastructure for dense computational workloads.", color: "#4b8bbe" },
      { title: "C++", desc: "Low-level, high-performance programming for embedded systems, real-time spatial odometry, and memory-critical applications.", color: "#00599C" },
      { title: "Node.js", desc: "Crafting scalable RESTful and WebSocket-based backend services with asynchronous, event-driven JavaScript runtimes.", color: "#339933" },
      { title: "ArduPilot", desc: "Diving into and modifying the massive ArduPilot C++ ecosystem to customize autonomous vehicle navigation and telemetry pipelines.", color: "#8E001C" },
      { title: "PostgreSQL", desc: "Relational data architecture, complex querying, index optimization, and data integrity in open-source object-relational database systems.", color: "#336791" }
    ]
  },
  { 
    id: "earth", title: "AUTOMATED HR PLATFORM", subtitle: "A responsive React dashboard that reduced manual data entry by 30%. Click to explore.", imageUrl: "/images/hr_platform.png",
    position: [0, 0, -240], color: "#00ffcc", size: 2.2, textureUrl: "/images/8k_earth_daymap.jpg",
    nodes: [
      { title: "Overview", image: true, desc: "Architected and engineered a completely responsive, full-stack React dashboard deeply integrated with scalable Node.js microservices to modernize legacy HR data flows. The platform automated multi-step validation checks, drastically transforming the client's internal processes. This directly reduced manual data entry overhead by over 30% and exponentially accelerated periodic HR reporting cycles through live analytics generation.", color: "#00ffcc" },
      { title: "Tech Stack", desc: "Node.js backend microservices with heavily optimized PostgreSQL indexing for data persistence, coupled with a fluid React-driven frontend UI leveraging complex state management.", color: "#eebb88" },
      { title: "Repository", desc: "View the full source code and documentation on GitHub.", link: "https://github.com/dert445/Automated_HR", linkText: "VIEW ON GITHUB", color: "#ffffff" }
    ]
  },
  { 
    id: "mars", title: "ROBOTIC ARM CONTROLLER", subtitle: "Interactive web interface for remote hardware manipulation with real-time control. Click to explore.", imageUrl: "/images/robotic_arm.png",
    position: [0, 0, -320], color: "#ff3300", size: 1.6, textureUrl: "/images/2k_mars.jpg",
    nodes: [
      { title: "Overview", image: true, desc: "A robust, highly secure interactive web interface designed explicitly for remote hardware manipulation over long distances. It features an ultra low-latency WebSockets backend communication protocol that streams positional data on the fly. Users can visually track precision 3D spatial metrics and confidently command physical robotic arm movements in absolute real-time without input delay.", color: "#ff3300" },
      { title: "Tech Stack", desc: "Lightweight HTML/JS frontend architecture combined with custom IoT hardware integration modules utilizing direct GPIO, telemetry parsing, and serial manipulation for native execution.", color: "#eebb88" },
      { title: "Repository", desc: "View the full source code and documentation on GitHub.", link: "https://github.com/dert445/robotic-arm-controller", linkText: "VIEW ON GITHUB", color: "#ffffff" }
    ]
  },
  { 
    id: "jupiter", title: "WEATHER FORECAST API", subtitle: "Async backend integrating with weather APIs for hyper-local environmental data. Click to explore.", imageUrl: "/images/weather_api.png",
    position: [0, 0, -400], color: "#cc9966", size: 6.5, textureUrl: "/images/2k_jupiter.jpg",
    nodes: [
      { title: "Overview", image: true, desc: "Engineered a high-availability asynchronous backend layer that perfectly interfaces with the OpenWeatherMap API and other environmental sensors. It autonomously runs chron-jobs to parse complex, hyper-local meteorological metrics, calculates trend deviations, and normalizes incredibly strict JSON payloads for direct consumption by rapid consumer-facing frontend applications without API rate-limit bottlenecks.", color: "#cc9966" },
      { title: "Tech Stack", desc: "Fully decoupled RESTful API architecture built with TypeScript. Implements strict typing validation, localized data caching strategies, and optimized payload structuring.", color: "#eebb88" },
      { title: "Repository", desc: "View the full source code and documentation on GitHub.", link: "https://github.com/dert445/Weather_forcasting_app", linkText: "VIEW ON GITHUB", color: "#ffffff" }
    ]
  },
  { 
    id: "saturn", title: "DATA & AUTONOMY", subtitle: "Data science hackathon solutions and autonomous vehicle research with ArduPilot. Click to explore.", imageUrl: "/images/data_autonomy.png",
    position: [0, 0, -480], color: "#eebb88", size: 5.5, textureUrl: "/images/2k_saturn.jpg", hasRing: true, ringTextureUrl: "/images/2k_saturn_ring_alpha.png",
    nodes: [
      { title: "Cosmosoc Data Science", image: true, desc: "Architected highly advanced Python scripts utilizing Pandas and NumPy to comprehensively clean, format, and dissect massive mission-critical scientific datasets. The automated extraction models identified deep space patterns, securing top accuracy during the highly competitive IIT Dharwad Space Data Science club induction hackathon.", color: "#66ccff",
        link: "https://github.com/dert445/Cosmosoc_Data_Science", linkText: "VIEW ON GITHUB" },
      { title: "ArduPilot Research", desc: "Navigating the foundational ArduPilot monolithic C++ codebase — conducting active experimentation with heavily documented sensor fusion logic, flight control stabilization loops, and autonomous bi-directional telemetry broadcasting.", color: "#ffcc00",
        link: "https://github.com/dert445/ardupilot", linkText: "VIEW FORK" },
      { title: "Resume Scanner", desc: "A lightweight highly customizable Python-based resume parsing analysis tool designed to extract, identify, and categorize structured candidate keywords and contact data out of dense raw text documents using natural language heuristics.", color: "#00ffcc",
        link: "https://github.com/dert445/resume_scanner", linkText: "VIEW ON GITHUB" }
    ]
  },
  { 
    id: "uranus", title: "EDUCATION", subtitle: "B.S. Interdisciplinary Science at IIT Dharwad. Click for details.",
    position: [0, 0, -560], color: "#66ccff", size: 3.8, textureUrl: "/images/2k_uranus.jpg",
    nodes: [
      { title: "Academic Degree", desc: "Currently pursuing a Bachelor of Science in Interdisciplinary Science, merging multiple scientific domains into holistic research approaches.", color: "#66ccff" },
      { title: "Institution", desc: "Indian Institute of Technology (IIT) Dharwad. Class of 2026–2029.", color: "#ffffff" },
      { title: "Core Coursework", desc: "Advanced Calculus, complex Linear Algebra, and foundational Data Structures & Algorithms applied to engineering problems.", color: "#eebb88" }
    ]
  },
  { 
    id: "neptune", title: "ESTABLISH CONTACT", subtitle: "Open for collaboration, discussions, and new missions. Click to reach out.",
    position: [0, 0, -640], color: "#3366ff", size: 3.6, textureUrl: "/images/2k_neptune.jpg",
    nodes: [
      { title: "Direct Protocol", isContactForm: true, desc: "Type your message below. This transmission will automatically parse and route directly to my secure inbox.", color: "#00ffcc" },
      { title: "Transmission", desc: "Communication lines are open for deployment orders, architectural discussions, or collaborative missions. Initiate a transmission below.", link: "mailto:debadrito.445@gmail.com", linkText: "SEND TRANSMISSION", color: "#ffcc00" },
      { title: "GitHub Profile", desc: "Browse all repositories, contributions, and open-source work.", link: "https://github.com/dert445", linkText: "VIEW PROFILE", color: "#ffffff" }
    ]
  }
];

// Welcome Screen Overlay Component
const WelcomeScreen = ({ onStartManual, onStartTour }) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(5, 5, 12, 0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999, color: '#fff', fontFamily: "'Orbitron', sans-serif"
    }}>
      <h1 style={{ fontSize: '48px', margin: '0 0 20px 0', textShadow: '0 0 20px #00ffcc', letterSpacing: '4px', textAlign: 'center' }}>
        COSMIC TERMINAL v2.0
      </h1>
      <p style={{ fontSize: '16px', color: '#aaaaaa', marginBottom: '40px', maxWidth: '600px', textAlign: 'center', lineHeight: '1.6' }}>
        Welcome to the Orbital Database. You can freely explore the planetary nodes manually, or engage the autopilot for a fully guided cinematic tour of the system.
      </p>
      <div style={{ display: 'flex', gap: '20px' }}>
        <button onClick={onStartTour} style={{
          padding: '16px 32px', fontSize: '14px', background: 'rgba(0, 255, 204, 0.2)', border: '1px solid #00ffcc',
          color: '#00ffcc', borderRadius: '4px', cursor: 'pointer', outline: 'none', textTransform: 'uppercase', fontWeight: 'bold',
          boxShadow: '0 0 15px rgba(0, 255, 204, 0.4)', transition: 'all 0.3s'
        }} onMouseEnter={(e) => e.target.style.background = 'rgba(0, 255, 204, 0.4)'} onMouseLeave={(e) => e.target.style.background = 'rgba(0, 255, 204, 0.2)'}>
          TAKE GUIDED TOUR
        </button>
        <button onClick={onStartManual} style={{
          padding: '16px 32px', fontSize: '14px', background: 'transparent', border: '1px solid #666666',
          color: '#cccccc', borderRadius: '4px', cursor: 'pointer', outline: 'none', textTransform: 'uppercase', fontWeight: 'bold',
          transition: 'all 0.3s'
        }} onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.target.style.background = 'transparent'}>
          EXPLORE MANUALLY
        </button>
      </div>
    </div>
  );
};

// Main Entry Point
export default function App() {
  const [layoutMode, setLayoutMode] = useState('Z');
  const [focusedPlanetId, setFocusedPlanetId] = useState(null);
  const [planetsData] = useState(resumePlanets);
  const [activeTargetId, setActiveTargetId] = useState(resumePlanets[0].id);

  // Core State for Guided Tour Engine
  const [hasStarted, setHasStarted] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // Background Music State
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    // Initialize audio instance (browser cache makes this instantly ready)
    audioRef.current = new Audio('/music/Star Rail · Main Theme (Login Menu BGM) - Honkai_ Star Rail 1.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.4; // Pleasant background volume

    // Try to auto-play immediately upon load
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsAudioPlaying(true);
        })
        .catch(e => {
          console.log('Autoplay blocked by browser. Queuing to start on first interaction.', e);
          
          // Force start the music the very first time the user interacts with the page
          const forceAudioStart = () => {
            if (audioRef.current) {
              audioRef.current.play().then(() => {
                setIsAudioPlaying(true);
                // Clean up the listeners once it starts
                window.removeEventListener('click', forceAudioStart);
                window.removeEventListener('keydown', forceAudioStart);
                window.removeEventListener('pointerdown', forceAudioStart);
                window.removeEventListener('wheel', forceAudioStart);
              }).catch(err => console.log('Wait for interaction...'));
            }
          };

          window.addEventListener('click', forceAudioStart);
          window.addEventListener('keydown', forceAudioStart);
          window.addEventListener('pointerdown', forceAudioStart);
          window.addEventListener('wheel', forceAudioStart);
        });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const toggleAudio = () => {
    if (isAudioPlaying) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.log('Audio playback prevented by browser:', e));
      setIsAudioPlaying(true);
    }
  };

  const handleStartManual = () => {
    setHasStarted(true);
  };

  const handleStartTour = () => {
    setHasStarted(true);
    setIsTourActive(true);
    setTourStep(0);
    setLayoutMode('Z'); // Enforce standard layout for the cinematic flyby
    
    // Auto-engage BGM utilizing the user's hard interaction click
    if (audioRef.current && !isAudioPlaying) {
      audioRef.current.play().then(() => setIsAudioPlaying(true)).catch(e => console.log('Audio error:', e));
    }
  };

  // Guided Tour Cinematic Engine
  useEffect(() => {
    if (!isTourActive) return;

    if (tourStep >= planetsData.length) {
      // Tour completed - terminate autopilot, restore native scrolling
      setIsTourActive(false);
      setTourStep(0);
      return;
    }

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const targetScroll = ((tourStep + 0.5) / planetsData.length) * maxScroll;
    
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });

    // Compute dynamic wait times. If it's the Sun or intro node (no sub-nodes), don't linger.
    const hasNodes = planetsData[tourStep].nodes && planetsData[tourStep].nodes.length > 0;
    const readTimeOffset = hasNodes ? 6000 : 2000;
    const advanceTimeOffset = hasNodes ? 6500 : 2500;

    // Timeline control execution loops
    const flyTimeout = setTimeout(() => {
      // Only expand nodes if there are valid child nodes present
      if (hasNodes) {
        setFocusedPlanetId(planetsData[tourStep].id);
      }
    }, 1500);

    const closeTimeout = setTimeout(() => {
      setFocusedPlanetId(null);
    }, readTimeOffset); // Wait interval for reading description

    const nextTimeout = setTimeout(() => {
      setTourStep(s => s + 1);
    }, advanceTimeOffset); // Engage warp to next planet

    return () => {
      clearTimeout(flyTimeout);
      clearTimeout(closeTimeout);
      clearTimeout(nextTimeout);
    };
  }, [isTourActive, tourStep, planetsData]);

  // Lock HTML scroll exclusively when needed
  useEffect(() => {
    if (!hasStarted || isTourActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto'; 
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [hasStarted, isTourActive]);

  // Clear focused planet when manually scrolling to a new active target
  useEffect(() => {
    // Only intercept if we aren't driving via the tour
    if (!isTourActive) {
      setFocusedPlanetId(null);
    }
  }, [activeTargetId, isTourActive]);

  return (
    <>
      {!hasStarted && <WelcomeScreen onStartManual={handleStartManual} onStartTour={handleStartTour} />}
      
      {isTourActive && (
        <div style={{
          position: 'fixed', bottom: '60px', width: '100%', textAlign: 'center', pointerEvents: 'none',
          color: '#00ffcc', zIndex: 1000, fontFamily: "'Orbitron', sans-serif",
          fontSize: '18px', fontWeight: 'bold', letterSpacing: '4px', textShadow: '0 0 10px #00ffcc',
          animation: 'pulseAction 1.5s infinite ease-in-out'
        }}>
          AUTOPILOT ENGAGED
        </div>
      )}

      {/* Global & Layout Styles injected inline for true single-file setup */}
      <LoadingScreen />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        
        * { box-sizing: border-box; }
        body, html {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background-color: #030308;
          cursor: none; /* Globally hide the default cursor */
          font-family: 'Orbitron', sans-serif;
        }
        
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #030308;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 204, 0.4);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 204, 0.8);
        }

        .canvas-wrapper {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 1;
        }
        
        /* The invisible block that powers native scrolling */
        .scroll-anchor {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2000vh; /* Scrollytelling Voyage Length increased for 9 bodies */
          z-index: 0;
        }
        
        .overlay-ui {
          position: fixed;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          pointer-events: none;
          color: white;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          opacity: 0.8;
          animation: float 2s ease-in-out infinite;
        }

        .overlay-ui p {
          margin: 0;
          font-size: 12px;
          letter-spacing: 4px;
          text-transform: uppercase;
          font-weight: 700;
          color: #00ffcc;
        }

        @keyframes float {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -10px); }
        }

        @keyframes nodeAppear {
          0% { opacity: 0; transform: scale(0.3) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes pulseAction {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.98); }
        }

        /* Responsive Scaling for Overlays */
        @media (max-width: 768px) {
          .planet-html > div {
            width: 220px !important;
            padding: 16px !important;
          }
          .planet-html h2 {
            font-size: 20px !important;
          }
          .planet-html p {
            font-size: 13px !important;
          }
          .overlay-ui p {
            font-size: 10px;
          }
        }
        
        .control-panel {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 100;
          display: flex;
          gap: 12px;
          background: rgba(5, 5, 10, 0.7);
          backdrop-filter: blur(8px);
          padding: 8px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .control-btn {
          background: transparent;
          border: 1px solid rgba(0, 255, 204, 0.3);
          color: #fff;
          font-family: inherit;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 700;
          transition: all 0.2s;
        }
        .control-btn:hover { background: rgba(0, 255, 204, 0.1); }
        .control-btn.active {
          background: rgba(0, 255, 204, 0.2);
          border-color: #00ffcc;
          box-shadow: 0 0 10px rgba(0, 255, 204, 0.4);
        }
      `}</style>
      
      {/* 2D Overlay layer */}
      <CustomCursor />
      
      {/* UI Control Panel */}
      <div className="control-panel">
        <button 
          className="control-btn" 
          onClick={toggleAudio}
          style={{ 
            marginRight: '12px', 
            color: isAudioPlaying ? '#00ffcc' : '#ccc',
            borderColor: isAudioPlaying ? '#00ffcc' : 'rgba(255,255,255,0.3)',
            background: isAudioPlaying ? 'rgba(0,255,204,0.1)' : 'transparent'
          }}
        >
          {isAudioPlaying ? 'BGM ON 🔊' : 'BGM OFF 🔈'}
        </button>
        <button className={`control-btn ${layoutMode === 'Z' ? 'active' : ''}`} onClick={() => setLayoutMode('Z')}>Voyage (Z)</button>
        <button className={`control-btn ${layoutMode === 'X' ? 'active' : ''}`} onClick={() => setLayoutMode('X')}>Gallery (X)</button>
        <button className={`control-btn ${layoutMode === 'Y' ? 'active' : ''}`} onClick={() => setLayoutMode('Y')}>Stack (Y)</button>
      </div>

      <div className="overlay-ui" style={{ opacity: layoutMode === 'Z' ? 0.8 : 0, transition: 'opacity 0.3s' }}>
        <ArrowDown size={24} color="#00ffcc" strokeWidth={2} />
        <p>Scroll to Explore</p>
      </div>
      
      {/* 3D WebGL Layer */}
      <div className="canvas-wrapper">
        <Canvas camera={{ fov: 60, near: 0.1, far: 2000, position: [0, 0, 20] }}>
          <color attach="background" args={['#010103']} />
          <ambientLight intensity={0.05} />
          
          <directionalLight position={[10, 20, 10]} intensity={3} color="#ffffff" />

          {/* Procedural High-Density Background Stars */}
          {/* Base ambient stars (small, dense, varied colors) */}
          <Stars radius={400} depth={100} count={20000} factor={4} saturation={1} fade speed={1} />
          {/* Medium stars (less dense, slightly larger) */}
          <Stars radius={400} depth={100} count={5000} factor={7} saturation={0.8} fade speed={1.5} />
          {/* Large, rare, bright stars */}
          <Stars radius={400} depth={100} count={1000} factor={12} saturation={1} fade speed={2} />

          {/* Procedural Milky Way: A dense band of stars achieved by crushing the Y axis of a huge starfield */}
          <group rotation={[Math.PI / 6, Math.PI / 3, 0]} scale={[1, 0.1, 1]}>
             <Stars radius={500} depth={200} count={35000} factor={5} saturation={1.5} fade speed={0.5} />
          </group>
          <group rotation={[Math.PI / 6, Math.PI / 3, 0]} scale={[1, 0.05, 1]}>
             <Stars radius={500} depth={200} count={25000} factor={8} saturation={1.5} fade speed={1} />
          </group>
          
          {/* Main Scrollytelling Setup */}
          {planetsData.length > 0 && (
            <CameraController 
              stops={planetsData} 
              layoutMode={layoutMode} 
              focusedPlanetId={focusedPlanetId} 
              activeTargetId={activeTargetId}
              setActiveTargetId={setActiveTargetId}
            />
          )}

          {/* Render all Celestial Bodies */}
          {planetsData.map((body, i) => {
            const posX = [(i - 4) * 18, 0, -30];
            const posY = [0, (4 - i) * 18, -30];
            return (
              <Planet 
                key={body.id} 
                {...body} 
                posX={posX} 
                posY={posY} 
                layoutMode={layoutMode} 
                focusedPlanetId={focusedPlanetId}
                setFocusedPlanetId={setFocusedPlanetId}
                isActive={activeTargetId === body.id}
                index={i}
              />
            );
          })}

        </Canvas>
      </div>

      {/* Drives the native scrollbar & GSAP progress */}
      <div className="scroll-anchor"></div>
    </>
  );
}
