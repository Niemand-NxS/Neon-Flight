import React, { useEffect, useRef, useState } from 'react';
import { GameStats, Obstacle, Particle, FloatingText, HighscoreRecord, ObstacleType } from '../types';
import { SHIPS, drawShip } from '../ships';
import { gameAudio } from '../lib/audio';
import { COLOR_COMBINATIONS } from '../lib/customization';

interface GameCanvasProps {
  selectedShipId: string;
  selectedColorId: string;
  selectedExhaustId: 'plasma' | 'nova' | 'sparks' | 'nebula' | 'lightning';
  gameState: 'menu' | 'playing' | 'paused' | 'gameover';
  isPaused: boolean;
  onGameOver: (stats: GameStats) => void;
  onScoreUpdate: (score: number) => void;
  onLevelUpdate: (level: number) => void;
  onNearMiss?: () => void;
  isCountdown?: boolean;
  reviveTrigger?: number;
  resetOnStart?: boolean;
}

export default function GameCanvas({
  selectedShipId,
  selectedColorId,
  selectedExhaustId,
  gameState,
  isPaused,
  onGameOver,
  onScoreUpdate,
  onLevelUpdate,
  onNearMiss,
  isCountdown = false,
  reviveTrigger = 0,
  resetOnStart = true,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Preserve callback references to prevent stale closures in the high performance game loop
  const callbacksRef = useRef({ onScoreUpdate, onGameOver, onLevelUpdate, onNearMiss });
  useEffect(() => {
    callbacksRef.current = { onScoreUpdate, onGameOver, onLevelUpdate, onNearMiss };
  });

  // Core game state refs to avoid state re-render lags in requestAnimationFrame
  const stateRef = useRef({
    gameState,
    isPaused,
    score: 0,
    scoreTime: 0, // accumulated time at safe altitudes
    timeSurvived: 0, // in ms
    level: 1,
    nearMisses: 0,
    playerX: 0,
    playerY: 0,
    playerVx: 0,
    playerVy: 0,
    playerAngle: 0, // current rotation angle in radians
    playerAngularVx: 0, // angular velocity
    playerVirtualX: 0, // horizontal virtual position
    altitude: 400, // altitude from plasma sea (safe > 280, dead <= 150)
    maxAltitude: 400, // peak altitude achieved
    atmosphereLayer: 0, // 0: Troposphere/Planet, 1: Stratosphere, 2: Space
    playerRadius: 22,
    playerWidth: 46,
    playerHeight: 46,
    screenShake: 0,
    lastSpawnTime: 0,
    lastTickTime: 0,
    mountainSeed1: Math.random() * 10000,
    mountainSeed2: Math.random() * 10000,
    currentGravity: 0,
  });

  // Keep refs synchronized with props
  useEffect(() => {
    stateRef.current.gameState = gameState;
    stateRef.current.isPaused = isPaused || !!isCountdown;
  }, [gameState, isPaused, isCountdown]);

  // Track active keys
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Track mobile touch zones
  const touchStateRef = useRef({ left: false, right: false });

  // Array of stars for parallax background
  const starsRef = useRef<{ x: number; y: number; size: number; speed: number; alpha: number }[]>([]);

  interface BackgroundPlanet {
    x: number;
    y: number;
    radius: number;
    speed: number;
    color: string;
    secondaryColor: string;
    glowColor: string;
    planetType: 'ringed' | 'gaseous' | 'rocky' | 'cratered';
    angle: number;
    rotationSpeed: number;
  }

  // Array of background planets for deep space depth
  const planetsRef = useRef<BackgroundPlanet[]>([]);

  // Array of obstacles, particles, and floating texts
  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  // Local state to expose current stats to UI if needed (rendered on top of Canvas)
  const [currentLevel, setCurrentLevel] = useState(1);

  // Initialize stars once
  const initStars = (width: number, height: number) => {
    const tempStars = [];
    for (let i = 0; i < 120; i++) {
      tempStars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 1.5 + 0.3, // different speeds for parallax
        alpha: Math.random() * 0.7 + 0.3,
      });
    }
    starsRef.current = tempStars;
  };

  // Helper to randomize background planet parameters (size, color, type, speed)
  const randomizePlanet = (planet: BackgroundPlanet, width: number, height: number) => {
    const types: ('ringed' | 'gaseous' | 'rocky' | 'cratered')[] = ['ringed', 'gaseous', 'rocky', 'cratered'];
    const colors = [
      { main: '#3a2f5c', secondary: '#70649a', glow: '#6a51a3' }, // Cosmic Purple
      { main: '#cc5533', secondary: '#ffaa44', glow: '#e06030' }, // Rust Orange/Gas Giant
      { main: '#1d4ed8', secondary: '#3b82f6', glow: '#60a5fa' }, // Deep Blue/Oceanic
      { main: '#15803d', secondary: '#22c55e', glow: '#4ade80' }, // Emerald Green
      { main: '#78716c', secondary: '#a8a29e', glow: '#d6d3d1' }, // Lunar Slate/Cratered
      { main: '#7c2d12', secondary: '#f97316', glow: '#ff7e00' }, // Radiant Amber/Solar
      { main: '#0369a1', secondary: '#06b6d4', glow: '#00e1ff' }, // Cyanshift Celestial
    ];
    const colorScheme = colors[Math.floor(Math.random() * colors.length)];
    planet.radius = Math.random() * 14 + 10; // significantly smaller! (10px to 24px)
    planet.speed = Math.random() * 0.08 + 0.02; // slower parallax than stars (0.02 - 0.1)
    planet.color = colorScheme.main;
    planet.secondaryColor = colorScheme.secondary;
    planet.glowColor = colorScheme.glow;
    planet.planetType = types[Math.floor(Math.random() * types.length)];
    planet.angle = Math.random() * Math.PI * 2;
    planet.rotationSpeed = (Math.random() - 0.5) * 0.003;
  };

  // Initialize planets once
  const initPlanets = (width: number, height: number) => {
    const tempPlanets = [];
    for (let i = 0; i < 5; i++) {
      const planet: BackgroundPlanet = {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0,
        speed: 0,
        color: '',
        secondaryColor: '',
        glowColor: '',
        planetType: 'rocky',
        angle: 0,
        rotationSpeed: 0,
      };
      randomizePlanet(planet, width, height);
      tempPlanets.push(planet);
    }
    planetsRef.current = tempPlanets;
  };

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = containerRef.current.getBoundingClientRect();
      
      const width = rect.width || window.innerWidth;
      const height = rect.height || window.innerHeight;

      canvasRef.current.width = width * dpr;
      canvasRef.current.height = height * dpr;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;

      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      // Initialize player position if it's the start
      if (stateRef.current.playerX === 0) {
        stateRef.current.playerX = width / 2;
        stateRef.current.playerY = height * 0.65;
      }

      if (starsRef.current.length === 0) {
        initStars(width, height);
        initPlanets(width, height);
      }
    };

    handleResize();

    let resizeAnimationFrameId: number;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeAnimationFrameId);
      resizeAnimationFrameId = requestAnimationFrame(() => {
        handleResize();
      });
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const onWindowResize = () => {
      cancelAnimationFrame(resizeAnimationFrameId);
      resizeAnimationFrameId = requestAnimationFrame(() => {
        handleResize();
      });
    };

    window.addEventListener('resize', onWindowResize);
    return () => {
      window.removeEventListener('resize', onWindowResize);
      resizeObserver.disconnect();
      cancelAnimationFrame(resizeAnimationFrameId);
    };
  }, []);

  // Set up Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'a', 'd', 's', 'w'].includes(e.key.toLowerCase())) {
        // Prevent browser scrolling
        e.preventDefault();
      }
      keysPressed.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Touch Event Listeners for Mobile
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      updateTouches(e.touches);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      updateTouches(e.touches);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      updateTouches(e.touches);
    };

    const updateTouches = (touches: TouchList) => {
      if (!canvas) return;
      let left = false;
      let right = false;
      const rect = canvas.getBoundingClientRect();
      const halfWidth = rect.width / 2;

      for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        // Calculate relative X coordinate in canvas
        const touchX = touch.clientX - rect.left;
        if (touchX < halfWidth) {
          left = true;
        } else {
          right = true;
        }
      }

      touchStateRef.current = { left, right };
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  // Reset Game States when game starts
  useEffect(() => {
    if (gameState === 'playing') {
      const width = canvasRef.current?.width ? canvasRef.current.width / (window.devicePixelRatio || 1) : window.innerWidth;
      const height = canvasRef.current?.height ? canvasRef.current.height / (window.devicePixelRatio || 1) : window.innerHeight;

      if (resetOnStart) {
        // Reset stats
        stateRef.current.score = 0;
        stateRef.current.scoreTime = 0;
        stateRef.current.timeSurvived = 0;
        stateRef.current.level = 1;
        stateRef.current.nearMisses = 0;
        stateRef.current.playerX = width / 2;
        stateRef.current.playerY = height * 0.65; // keep centered vertical position
        stateRef.current.playerVx = 0;
        stateRef.current.playerVy = 0;
        stateRef.current.playerAngle = 0;
        stateRef.current.playerAngularVx = 0;
        stateRef.current.playerVirtualX = 0;
        stateRef.current.altitude = 400;
        stateRef.current.maxAltitude = 400;
        stateRef.current.atmosphereLayer = 0;
        stateRef.current.screenShake = 0;
        stateRef.current.lastSpawnTime = 0;
        stateRef.current.lastTickTime = performance.now();
        stateRef.current.mountainSeed1 = Math.random() * 10000;
        stateRef.current.mountainSeed2 = Math.random() * 10000;

        // Completely recreate background elements
        initStars(width, height);
        initPlanets(width, height);

        obstaclesRef.current = [];
        particlesRef.current = [];
        floatingTextsRef.current = [];
        setCurrentLevel(1);
        callbacksRef.current.onLevelUpdate(1);
        callbacksRef.current.onScoreUpdate(0);
      } else {
        // Reviving: Do NOT reset score, level, or altitude!
        // Just clear obstacles around player and stabilize player
        stateRef.current.playerVx = 0;
        stateRef.current.playerVy = 0;
        stateRef.current.playerAngle = 0;
        stateRef.current.playerAngularVx = 0;
        stateRef.current.lastTickTime = performance.now();
        obstaclesRef.current = [];
        particlesRef.current = [];
        addFloatingText(width / 2, height * 0.4, 'WIEDERBELEBT!', '#22c55e', 26, 1500, -0.5);
      }
    }
  }, [gameState, resetOnStart, reviveTrigger]);

  // Main Game Loop using requestAnimationFrame
  useEffect(() => {
    let animationId: number;

    const gameLoop = (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationId = requestAnimationFrame(gameLoop);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationId = requestAnimationFrame(gameLoop);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // Clear the screen with a dynamic atmosphere gradient based on current altitude
      const alt = stateRef.current.altitude;
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      
      // Multi-stage atmospheric keyframes for gorgeous smooth colors
      const keyframes = [
        { alt: 400,  top: { r: 15, g: 10, b: 33 },  bottom: { r: 190, g: 18, b: 60 } },   // Troposphäre Launchpad Sunset
        { alt: 800,  top: { r: 10, g: 5, b: 25 },   bottom: { r: 30, g: 10, b: 55 } },    // Stratosphäre Eintritt
        { alt: 1600, top: { r: 1, g: 3, b: 15 },    bottom: { r: 15, g: 30, b: 70 } },    // Mesosphäre Eintritt
        { alt: 2600, top: { r: 1, g: 2, b: 8 },     bottom: { r: 110, g: 45, b: 10 } },   // Thermosphäre Sonnenflackern
        { alt: 4000, top: { r: 1, g: 1, b: 3 },     bottom: { r: 2, g: 4, b: 12 } },      // Exosphäre & Freies Weltall
      ];

      const lerp = (start: number, end: number, amt: number) => Math.round(start + (end - start) * amt);
      const lerpColor = (c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }, amt: number) => ({
        r: lerp(c1.r, c2.r, amt),
        g: lerp(c1.g, c2.g, amt),
        b: lerp(c1.b, c2.b, amt),
      });

      let finalTop = { r: 1, g: 1, b: 3 };
      let finalBot = { r: 2, g: 4, b: 12 };

      if (alt <= keyframes[0].alt) {
        finalTop = keyframes[0].top;
        finalBot = keyframes[0].bottom;
      } else if (alt >= keyframes[keyframes.length - 1].alt) {
        finalTop = keyframes[keyframes.length - 1].top;
        finalBot = keyframes[keyframes.length - 1].bottom;
      } else {
        // Interpole between the active keyframes
        for (let i = 0; i < keyframes.length - 1; i++) {
          const k1 = keyframes[i];
          const k2 = keyframes[i+1];
          if (alt >= k1.alt && alt <= k2.alt) {
            const progress = (alt - k1.alt) / (k2.alt - k1.alt);
            finalTop = lerpColor(k1.top, k2.top, progress);
            finalBot = lerpColor(k1.bottom, k2.bottom, progress);
            break;
          }
        }
      }

      grad.addColorStop(0, `rgb(${finalTop.r}, ${finalTop.g}, ${finalTop.b})`);
      grad.addColorStop(1, `rgb(${finalBot.r}, ${finalBot.g}, ${finalBot.b})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render Parallax Background Planets & Stars
      drawPlanets(ctx, width, height);
      drawStars(ctx, width, height);

      // Render the starting planet surface (launchpad, support towers, mountains)
      drawStartingPlanet(ctx, width, height);

      const state = stateRef.current;

      if (state.gameState === 'playing' && !state.isPaused) {
        const delta = timestamp - state.lastTickTime;
        state.lastTickTime = timestamp;

        // Limit huge spikes
        const dt = Math.min(delta, 100);

        // Update stats time
        state.timeSurvived += dt;

        // Keep track of peak altitude achieved
        state.maxAltitude = Math.max(state.maxAltitude, state.altitude);

        // Level scaling based on peak altitude achieved (every 400m climbed increments the level, up to level 10 at 4000m deep space)
        const newLevel = Math.max(1, Math.min(10, Math.floor((state.maxAltitude - 400) / 400) + 1));
        if (newLevel !== state.level) {
          state.level = newLevel;
          setCurrentLevel(newLevel);
          callbacksRef.current.onLevelUpdate(newLevel);
        }

        // Score is based on the vertical distance traveled upwards (from initial 400 altitude)
        const oldScore = state.score;
        const climbScore = Math.max(0, Math.floor(state.maxAltitude - 400));
        state.score = climbScore + state.nearMisses * 150;
        
        if (state.score !== oldScore) {
          callbacksRef.current.onScoreUpdate(state.score);
        }

        // Apply Player Physics
        updatePlayerPhysics(width, height, dt);



        // Spawn obstacles
        handleObstacleSpawning(width, height, timestamp);

        // Update obstacles & check collisions
        updateObstacles(width, height, dt);

        // Update particles
        updateParticles(dt);

        // Update floating texts
        updateFloatingTexts(dt);
      } else if (state.gameState === 'gameover' && !state.isPaused) {
        // Keep tick time updated & let existing visual items continue drifting / animating
        const delta = timestamp - state.lastTickTime;
        state.lastTickTime = timestamp;
        const dt = Math.min(delta, 100);

        // Let particles expand & obstacles drift
        updateObstacles(width, height, dt);
        updateParticles(dt);
        updateFloatingTexts(dt);
      } else {
        // Keep tick time updated even when paused or in menu so delta doesn't explode
        state.lastTickTime = timestamp;
      }

      // Draw active thruster touch indicators (glowing vertical zones on mobile)
      drawTouchIndicators(ctx, width, height);

      // Draw all elements
      drawParticles(ctx);
      drawObstacles(ctx);
      drawFloatingTexts(ctx);

      // Draw Altimeter tape HUD
      drawAltimeter(ctx, width, height);

      // Draw Speedometer HUD (bottom right)
      drawSpeedometer(ctx, width, height);

      // Draw player ship with screenshake
      ctx.save();
      if (state.screenShake > 0.1) {
        const shakeX = (Math.random() - 0.5) * state.screenShake;
        const shakeY = (Math.random() - 0.5) * state.screenShake;
        ctx.translate(shakeX, shakeY);
        state.screenShake *= 0.9; // decay shake
      }

      if (state.gameState === 'playing' || state.gameState === 'paused') {
        const parsedDesignId = parseInt(selectedShipId.replace('ship_', ''), 10) || 1;
        const activeColorCombo = COLOR_COMBINATIONS.find((c) => c.id === selectedColorId) || COLOR_COMBINATIONS[0];
        
        const keyLeft = keysPressed.current['arrowleft'] || keysPressed.current['a'];
        const keyRight = keysPressed.current['arrowright'] || keysPressed.current['d'];
        const touchLeft = touchStateRef.current.left;
        const touchRight = touchStateRef.current.right;

        const inputLeft = keyLeft || touchLeft;
        const inputRight = keyRight || touchRight;

        // Steering Left (inputLeft) fires right engine to rotate left
        // Steering Right (inputRight) fires left engine to rotate right
        const engineLeft = inputRight;
        const engineRight = inputLeft;

        drawShip(
          ctx,
          parsedDesignId,
          state.playerX,
          state.playerY,
          state.playerWidth,
          state.playerHeight,
          activeColorCombo.primary,
          activeColorCombo.secondary,
          engineLeft,
          engineRight,
          timestamp,
          state.playerAngle
        );
      }
      ctx.restore();

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [selectedShipId, selectedColorId, gameState, isPaused]);

  // Draw procedural background planets with layered 3D rings and shading
  const drawPlanets = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current;

    // Background planets fade in beautifully as we leave the thick lower atmosphere (0 at 400m, 1 at 1900m)
    const visibilityProgress = Math.max(0, Math.min(1, (state.altitude - 400) / 1500));

    planetsRef.current.forEach((planet) => {
      ctx.save();

      // Atmospheric fade-in for background planet base
      ctx.globalAlpha = visibilityProgress;

      // Atmospheric glow shadow
      ctx.shadowColor = planet.glowColor;
      ctx.shadowBlur = planet.radius * 0.45;
      ctx.fillStyle = planet.color;

      // Draw main sphere
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0; // Turn off shadows for interior crisp details

      // Inner features with clipping mask
      ctx.save();
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
      ctx.clip();

      // Create a beautiful spherical depth gradient (shading opposite of sun direction)
      const shadeGrad = ctx.createRadialGradient(
        planet.x - planet.radius * 0.35,
        planet.y - planet.radius * 0.35,
        planet.radius * 0.1,
        planet.x,
        planet.y,
        planet.radius
      );
      shadeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
      shadeGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
      shadeGrad.addColorStop(1, 'rgba(2, 5, 15, 0.82)'); // Deep dark shadow side

      if (planet.planetType === 'gaseous') {
        // Draw Gas Giant bands/stripes inside
        ctx.fillStyle = planet.secondaryColor;
        ctx.globalAlpha = 0.55 * visibilityProgress;
        const bands = 5;
        const bandHeight = planet.radius * 0.18;
        for (let j = -2; j <= 2; j++) {
          const yOffset = j * planet.radius * 0.35 + Math.sin(planet.angle + j) * 4;
          ctx.beginPath();
          ctx.ellipse(
            planet.x,
            planet.y + yOffset,
            planet.radius * 1.2,
            bandHeight,
            planet.angle * 0.15,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      } else if (planet.planetType === 'cratered') {
        // Draw impact crater overlays
        ctx.fillStyle = planet.secondaryColor;
        ctx.globalAlpha = 0.45 * visibilityProgress;
        const craters = 4;
        for (let j = 0; j < craters; j++) {
          const localAngle = planet.angle + (j * Math.PI * 2) / craters;
          const dist = planet.radius * 0.42;
          const cx = planet.x + Math.cos(localAngle) * dist;
          const cy = planet.y + Math.sin(localAngle) * dist;
          const r = planet.radius * (0.15 + j * 0.05);

          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx, cy, r, Math.PI * 0.25, Math.PI * 1.25);
          ctx.stroke();
        }
      } else if (planet.planetType === 'rocky') {
        // Draw organic landmasses
        ctx.fillStyle = planet.secondaryColor;
        ctx.globalAlpha = 0.5 * visibilityProgress;
        ctx.save();
        ctx.translate(planet.x, planet.y);
        ctx.rotate(planet.angle);

        ctx.beginPath();
        ctx.arc(-planet.radius * 0.25, -planet.radius * 0.15, planet.radius * 0.45, 0, Math.PI * 2);
        ctx.arc(planet.radius * 0.28, planet.radius * 0.22, planet.radius * 0.52, 0, Math.PI * 2);
        ctx.arc(-planet.radius * 0.32, planet.radius * 0.4, planet.radius * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Layer 3D Spherical shadow overlay
      ctx.fillStyle = shadeGrad;
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // End clipping

      // Draw beautiful planetary Saturn-like Rings (layered 3D overlap)
      if (planet.planetType === 'ringed') {
        // Back side of rings (drawn under/behind planet front)
        ctx.save();
        ctx.translate(planet.x, planet.y);
        ctx.rotate(planet.angle + 0.25); // tilt

        // Wide dusty ring
        ctx.strokeStyle = planet.secondaryColor;
        ctx.globalAlpha = 0.65 * visibilityProgress;
        ctx.lineWidth = planet.radius * 0.25;
        ctx.beginPath();
        ctx.ellipse(0, 0, planet.radius * 1.75, planet.radius * 0.38, 0, Math.PI, Math.PI * 2);
        ctx.stroke();

        // Glowing center ring groove
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.3 * visibilityProgress;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, planet.radius * 1.62, planet.radius * 0.34, 0, Math.PI, Math.PI * 2);
        ctx.stroke();

        ctx.restore();

        // Front side of rings (drawn over planet front)
        ctx.save();
        ctx.translate(planet.x, planet.y);
        ctx.rotate(planet.angle + 0.25);

        // Wide dusty ring front
        ctx.strokeStyle = planet.secondaryColor;
        ctx.globalAlpha = 0.65 * visibilityProgress;
        ctx.lineWidth = planet.radius * 0.25;
        ctx.beginPath();
        ctx.ellipse(0, 0, planet.radius * 1.75, planet.radius * 0.38, 0, 0, Math.PI);
        ctx.stroke();

        // Glowing center ring groove front
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.3 * visibilityProgress;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, planet.radius * 1.62, planet.radius * 0.34, 0, 0, Math.PI);
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore();

      // Scroll with Parallax
      if (state.gameState === 'playing' && !state.isPaused) {
        const vx_rel = -state.playerVx * planet.speed * 0.15;
        const vy_rel = -state.playerVy * planet.speed * 0.15;

        planet.x += vx_rel;
        planet.y += vy_rel;
        planet.angle += planet.rotationSpeed;

        // Wrap around boundaries and spawn/recycle as a brand new planet!
        const padding = planet.radius * 3;
        if (planet.y - padding > height) {
          randomizePlanet(planet, width, height);
          planet.y = -padding;
          planet.x = Math.random() * width;
        } else if (planet.y + padding < 0) {
          randomizePlanet(planet, width, height);
          planet.y = height + padding;
          planet.x = Math.random() * width;
        }

        if (planet.x - padding > width) {
          randomizePlanet(planet, width, height);
          planet.x = -padding;
          planet.y = Math.random() * height;
        } else if (planet.x + padding < 0) {
          randomizePlanet(planet, width, height);
          planet.x = width + padding;
          planet.y = Math.random() * height;
        }
      }
    });
  };

  // Handle Stars Scrolling (Parallax)
  const drawStars = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    const state = stateRef.current;
    
    // Fade stars in beautifully as we leave the thick troposphere/starting atmosphere (0 at 400m, 1 at 1600m)
    const visibilityProgress = Math.max(0, Math.min(1, (state.altitude - 400) / 1200));

    // Calculate a local dtFactor based on performance timestamps to keep movement ultra smooth
    const now = performance.now();
    const elapsed = state.lastTickTime ? Math.min(now - state.lastTickTime, 100) : 16.666;
    const dtFactor = elapsed / 16.666;

    starsRef.current.forEach((star) => {
      // Draw star
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = star.alpha * visibilityProgress;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();

      // Scroll star based on player movement
      if (state.gameState === 'playing' && !state.isPaused) {
        // Star movement vectors:
        // Horizontal: opposite of player horizontal velocity
        // Vertical: opposite of player vertical velocity
        const vx_rel = -state.playerVx * star.speed * 0.12 * dtFactor;
        const vy_rel = -state.playerVy * star.speed * 0.12 * dtFactor;

        star.x += vx_rel;
        star.y += vy_rel;

        // Wrap seamlessly on the same axis without randomized coordinates!
        if (star.y > height) {
          star.y = 0;
        } else if (star.y < 0) {
          star.y = height;
        }

        if (star.x > width) {
          star.x = 0;
        } else if (star.x < 0) {
          star.x = width;
        }
      }
    });

    ctx.restore();
  };

  // Dynamic wavy ground elevation function
  const getGroundAltitude = (virtualX: number): number => {
    const padHalfWidth = 140; // Flat pad is 280 wide (from -140 to +140)
    if (Math.abs(virtualX) <= padHalfWidth) {
      return 400; // Flat pad altitude is exactly 400
    }
    
    const transitionStart = padHalfWidth;
    const transitionEnd = padHalfWidth + 120;
    const absX = Math.abs(virtualX);
    const t = Math.min(1, (absX - transitionStart) / (transitionEnd - transitionStart));
    
    // Wave calculations for natural rolling rocky terrain
    const wave1 = Math.sin(virtualX * 0.0035) * 55;
    const wave2 = Math.cos(virtualX * 0.009) * 22;
    const wave3 = Math.sin(virtualX * 0.018) * 8;
    
    // The hills can rise or dip below 400m
    const groundOffset = (wave1 + wave2 + wave3) * t;
    return 400 + groundOffset;
  };

  const updatePlayerPhysics = (width: number, height: number, dt: number) => {
    const state = stateRef.current;
    
    const parsedDesignId = parseInt(selectedShipId.replace('ship_', ''), 10) || 1;
    const ship = SHIPS.find((s) => s.designId === parsedDesignId) || SHIPS[0];
    const activeColorCombo = COLOR_COMBINATIONS.find((c) => c.id === selectedColorId) || COLOR_COMBINATIONS[0];
    const customColor = activeColorCombo.primary;
    const customSecondaryColor = activeColorCombo.secondary;

    // Read active inputs
    const keyLeft = keysPressed.current['arrowleft'] || keysPressed.current['a'];
    const keyRight = keysPressed.current['arrowright'] || keysPressed.current['d'];

    const touchLeft = touchStateRef.current.left;
    const touchRight = touchStateRef.current.right;

    const inputLeft = keyLeft || touchLeft;
    const inputRight = keyRight || touchRight;

    if (inputLeft || inputRight) {
      gameAudio.playThrust();
    }

    // Fixed ship screen center
    state.playerX = width / 2;
    state.playerY = height * 0.65;

    // Schwerkraft nimmt mit der Höhe ab (1.0 am Boden (400), 0.0 im Weltall (4000))
    const gravityBase = 0.16; // Moderate Schwerkraft
    const gravityMult = Math.max(0, 1 - (state.altitude - 400) / 3600);
    const gravity = gravityBase * gravityMult;
    state.currentGravity = gravity;

    // Luftwiderstand/Reibung nimmt mit dünnerer Atmosphäre ab!
    let frictionX = 0.975;
    let frictionY = 0.96;

    if (state.altitude >= 4000) {
      // Exosphere & Deep Space: Perfect weightless drift!
      frictionX = 0.992;
      frictionY = 0.994;
    } else if (state.altitude >= 2600) {
      // Thermosphere
      frictionX = 0.988;
      frictionY = 0.990;
    } else if (state.altitude >= 1600) {
      // Mesosphere
      frictionX = 0.984;
      frictionY = 0.985;
    } else if (state.altitude >= 800) {
      // Stratosphere
      frictionX = 0.980;
      frictionY = 0.978;
    }

    const frictionAngular = 0.88; // Dreh-Luftwiderstand

    // Torque (turning force) and Thrust scaled with handling and thrust stats
    const torquePower = 0.0055 + (ship.statHandling * 0.0006);
    const thrustPower = 0.22 + (ship.statThrust * 0.02);

    const dtFactor = dt / 16.666; // Normalized to 60fps

    // Schwerkraft zieht nach unten (erhöht positive Vy, bremst negative Vy beim Aufstieg)
    state.playerVy += gravity * dtFactor;

    // Richtungsausrichtung des Schiffs berechnen
    const headingX = Math.sin(state.playerAngle);
    const headingY = -Math.cos(state.playerAngle);
    const leftX = -Math.cos(state.playerAngle);
    const leftY = -Math.sin(state.playerAngle);

    if (inputLeft && inputRight) {
      // BEIDE gedrückt -> Maximaler Schub nach vorne in Ausrichtung des Schiffs, kein Drehmoment
      const force = thrustPower * 1.5;
      state.playerVx += headingX * force * dtFactor;
      state.playerVy += headingY * force * dtFactor;
      
      // Rotation zur Mitte stabilisieren
      state.playerAngularVx *= 0.82;

      // Abgase auf beiden Triebwerken spawnen
      spawnEngineParticles(
        state.playerX + leftX * 12 - headingX * 12,
        state.playerY + leftY * 12 - headingY * 12,
        -headingX,
        -headingY,
        customColor,
        customSecondaryColor
      );
      spawnEngineParticles(
        state.playerX - leftX * 12 - headingX * 12,
        state.playerY - leftY * 12 - headingY * 12,
        -headingX,
        -headingY,
        customColor,
        customSecondaryColor
      );
    } else if (inputLeft) {
      // NUR Links gedrückt -> Dreht Schiff nach LINKS (Gegenuhrzeigersinn Drehmoment) und gibt Schub
      state.playerAngularVx -= torquePower * dtFactor;

      const force = thrustPower * 0.8;
      state.playerVx += headingX * force * dtFactor;
      state.playerVy += headingY * force * dtFactor;

      // Rechter Antrieb feuert (dreht Nase links)
      spawnEngineParticles(
        state.playerX - leftX * 12 - headingX * 12,
        state.playerY - leftY * 12 - headingY * 12,
        -headingX,
        -headingY,
        customColor,
        customSecondaryColor
      );
    } else if (inputRight) {
      // NUR Rechts gedrückt -> Dreht Schiff nach RECHTS (Uhrzeigersinn Drehmoment) und gibt Schub
      state.playerAngularVx += torquePower * dtFactor;

      const force = thrustPower * 0.8;
      state.playerVx += headingX * force * dtFactor;
      state.playerVy += headingY * force * dtFactor;

      // Linker Antrieb feuert (dreht Nase rechts)
      spawnEngineParticles(
        state.playerX + leftX * 12 - headingX * 12,
        state.playerY + leftY * 12 - headingY * 12,
        -headingX,
        -headingY,
        customColor,
        customSecondaryColor
      );
    }

    // Passiver Triebwerkstrahl beim Gleiten
    if (Math.random() < 0.25) {
      particlesRef.current.push({
        x: state.playerX - headingX * 16 + (Math.random() - 0.5) * 6,
        y: state.playerY - headingY * 16 + (Math.random() - 0.5) * 6,
        vx: -headingX * 2 + (Math.random() - 0.5) * 1,
        vy: -headingY * 2 + (Math.random() - 0.5) * 1,
        color: 'rgba(100, 150, 255, 0.35)',
        alpha: 0.5,
        size: Math.random() * 2 + 1,
        life: 0,
        maxLife: 250,
        type: 'engine',
      });
    }

    // Maximale Geschwindigkeiten begrenzen
    const maxVx = 6.2;
    const maxVyUp = 7.8;   // Maximale Aufstiegsgeschwindigkeit (Vy negativ)

    if (state.playerVx > maxVx) state.playerVx = maxVx;
    if (state.playerVx < -maxVx) state.playerVx = -maxVx;
    if (state.playerVy < -maxVyUp) state.playerVy = -maxVyUp;

    // Winkel-Integrierung und Dämpfung
    state.playerAngle += state.playerAngularVx * dtFactor;
    state.playerAngularVx *= Math.pow(frictionAngular, dtFactor);

    // Dämpfung auf Geschwindigkeiten anwenden (Luftwiderstand)
    state.playerVx *= Math.pow(frictionX, dtFactor);
    state.playerVy *= Math.pow(frictionY, dtFactor);

    // Positionsintegrat
    state.playerVirtualX += state.playerVx * dtFactor;
    state.altitude -= state.playerVy * 0.12 * dtFactor;

    // Winkel begrenzen zwischen -Math.PI und Math.PI
    if (state.playerAngle > Math.PI) state.playerAngle -= Math.PI * 2;
    if (state.playerAngle < -Math.PI) state.playerAngle += Math.PI * 2;

    // Bodenkollision am welligen Gelände
    const currentGroundAlt = getGroundAltitude(state.playerVirtualX);
    if (state.altitude <= currentGroundAlt) {
      state.altitude = currentGroundAlt;
      
      const descentSpeed = state.playerVy; // Positiv bei Abwärtsbewegung
      const tiltAngle = Math.abs(state.playerAngle);

      // Verzeihendes Aufprall-Limit (Crasht nur bei unkontrolliertem Sturz)
      if (descentSpeed > 1.8 || tiltAngle > 0.5) {
        triggerCrash(state.playerX, state.playerY + 20, '#ff003c');
      } else {
        if (state.playerVy > 0) {
          state.playerVy = 0; // Sanft gelandet
        }
        // Schiff aufrecht ausrichten auf dem Boden
        state.playerAngle *= Math.pow(0.85, dtFactor);
        state.playerAngularVx *= Math.pow(0.85, dtFactor);
      }
    }

    // Atmosphärebenen-Übergang und schöne schwebende Texte
    const oldLayer = state.atmosphereLayer || 0;
    let newLayer = 0; // 0: Troposphäre, 1: Stratosphäre, 2: Mesosphäre, 3: Thermosphäre, 4: Weltall
    if (state.altitude >= 4000) {
      newLayer = 4;
    } else if (state.altitude >= 2600) {
      newLayer = 3;
    } else if (state.altitude >= 1600) {
      newLayer = 2;
    } else if (state.altitude >= 800) {
      newLayer = 1;
    }

    if (newLayer !== oldLayer) {
      state.atmosphereLayer = newLayer;
      if (newLayer === 1) {
        addFloatingText(width / 2, height * 0.40, 'BETRETE STRATOSPHÄRE', '#c084fc', 20, 2500, -0.3);
        addFloatingText(width / 2, height * 0.44, 'Luftdichte & Schwerkraft verringert!', '#a78bfa', 11, 2500, -0.3);
      } else if (newLayer === 2) {
        addFloatingText(width / 2, height * 0.40, 'BETRETE MESOSPHÄRE', '#38bdf8', 20, 2500, -0.3);
        addFloatingText(width / 2, height * 0.44, 'Elektromagnetische Wellen. Minimale Reibung!', '#60a5fa', 11, 2500, -0.3);
      } else if (newLayer === 3) {
        addFloatingText(width / 2, height * 0.40, 'BETRETE THERMOSPHÄRE', '#fb923c', 20, 2500, -0.3);
        addFloatingText(width / 2, height * 0.44, 'Extreme Sonnenstrahlung. Schwerkraft minimal!', '#fdba74', 11, 2500, -0.3);
      } else if (newLayer === 4) {
        addFloatingText(width / 2, height * 0.40, 'WELTALL ERREICHT', '#22c55e', 22, 3000, -0.3);
        addFloatingText(width / 2, height * 0.44, 'Kosmische Schwerelosigkeit erreicht!', '#4ade80', 11, 3000, -0.3);
      } else if (newLayer === 3 && oldLayer === 4) {
        addFloatingText(width / 2, height * 0.40, 'SINKFLUG: THERMOSPHÄRE', '#fb923c', 18, 2500, -0.3);
      } else if (newLayer === 2 && oldLayer === 3) {
        addFloatingText(width / 2, height * 0.40, 'SINKFLUG: MESOSPHÄRE', '#38bdf8', 18, 2500, -0.3);
      } else if (newLayer === 1 && oldLayer === 2) {
        addFloatingText(width / 2, height * 0.40, 'SINKFLUG: STRATOSPHÄRE', '#c084fc', 18, 2500, -0.3);
      } else if (newLayer === 0 && oldLayer === 1) {
        addFloatingText(width / 2, height * 0.40, 'BETRETE TROPOSPHÄRE', '#f59e0b', 20, 2500, -0.3);
        addFloatingText(width / 2, height * 0.44, 'Dichte Atmosphäre erhöht Schwerkraft & Reibung!', '#fbbf24', 11, 2500, -0.3);
      }
    }

    // Limit altitude range (uncapped at top to allow infinite climbing distance!)
    state.altitude = Math.max(400, state.altitude);
  };

  // Spawn Wall Spark particles
  const triggerWallSpark = (x: number, y: number, color: string, dirSign: number) => {
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() * 4) * dirSign,
        vy: (Math.random() - 0.5) * 5,
        color: '#ffffff',
        alpha: 0.9,
        size: Math.random() * 2 + 1.5,
        life: 0,
        maxLife: 250,
        type: 'near-miss',
      });
    }
  };

  // Spawn Engine Rocket Flames
  const spawnEngineParticles = (x: number, y: number, dirX: number, dirY: number, color1: string, color2: string) => {
    const count = selectedExhaustId === 'sparks' ? 4 : 2;
    for (let i = 0; i < count; i++) {
      let vx = 0;
      let vy = 0;
      let size = 0;
      let maxLife = 0;
      let color = '';

      switch (selectedExhaustId) {
        case 'nova':
          size = Math.random() * 5.5 + 3.5;
          maxLife = Math.random() * 180 + 140;
          vx = dirX * (5.5 + Math.random() * 4.5) + (Math.random() - 0.5) * 3;
          vy = dirY * (5.5 + Math.random() * 4.5) + (Math.random() - 0.5) * 3;
          color = Math.random() < 0.6 ? color1 : (Math.random() < 0.7 ? color2 : '#ffffff');
          break;
        case 'sparks':
          size = Math.random() * 1.5 + 0.6;
          maxLife = Math.random() * 140 + 80;
          vx = dirX * (8 + Math.random() * 5) + (Math.random() - 0.5) * 1.5;
          vy = dirY * (8 + Math.random() * 5) + (Math.random() - 0.5) * 1.5;
          color = Math.random() < 0.2 ? '#ffffff' : (Math.random() < 0.5 ? color1 : color2);
          break;
        case 'nebula':
          size = Math.random() * 5 + 3;
          maxLife = Math.random() * 380 + 260;
          vx = dirX * (1.2 + Math.random() * 1.2) + (Math.random() - 0.5) * 2;
          vy = dirY * (1.2 + Math.random() * 1.2) + (Math.random() - 0.5) * 2;
          color = Math.random() < 0.5 ? color1 : color2;
          break;
        case 'lightning':
          size = Math.random() * 2.8 + 1.2;
          maxLife = Math.random() * 110 + 70;
          vx = dirX * (4.5 + Math.random() * 3.5) + (Math.random() - 0.5) * 4.5;
          vy = dirY * (4.5 + Math.random() * 3.5) + (Math.random() - 0.5) * 4.5;
          color = Math.random() < 0.35 ? '#00ffff' : (Math.random() < 0.6 ? color1 : '#ffffff');
          break;
        case 'plasma':
        default:
          size = Math.random() * 4 + 2;
          maxLife = 250;
          vx = dirX * (4 + Math.random() * 3) + (Math.random() - 0.5) * 1.5;
          vy = dirY * (4 + Math.random() * 3) + (Math.random() - 0.5) * 1.5;
          color = Math.random() < 0.5 ? color1 : color2;
          break;
      }

      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx,
        vy,
        color,
        alpha: selectedExhaustId === 'nebula' ? 0.75 : 0.9,
        size,
        life: 0,
        maxLife,
        type: 'engine',
      });
    }
  };

  // Spawning Obstacles dynamically with difficulty curve scaling
  const handleObstacleSpawning = (width: number, height: number, timestamp: number) => {
    const state = stateRef.current;
    
    // Defer spawning until we leave the safety zone of the launchpad
    if (state.altitude < 500) {
      return;
    }
    
    // Dynamic spawning interval: level 1 is 1800ms, level 10 is 450ms
    const baseInterval = 1800;
    const currentInterval = Math.max(450, baseInterval - (state.level * 140));

    if (timestamp - state.lastSpawnTime >= currentInterval) {
      state.lastSpawnTime = timestamp;

      // Decide how many obstacles to spawn at once (increases with level)
      const maxSpawns = state.level >= 8 ? 3 : (state.level >= 4 ? 2 : 1);
      const spawnCount = Math.floor(Math.random() * maxSpawns) + 1;

      for (let i = 0; i < spawnCount; i++) {
        // Stratified obstacle selection based on altitude
        const alt = state.altitude;
        let typesUnlocked: ObstacleType[] = [];

        if (alt < 800) {
          typesUnlocked = ['airplane'];
        } else if (alt < 1600) {
          typesUnlocked = ['airplane', 'balloon'];
        } else if (alt < 2600) {
          typesUnlocked = ['balloon', 'satellite', 'meteor'];
        } else if (alt < 4000) {
          typesUnlocked = ['satellite', 'meteor', 'comet', 'plasma_orb'];
        } else {
          // Space: all cosmic obstacles
          typesUnlocked = ['meteor', 'comet', 'plasma_orb', 'laser_drone', 'void_crystal', 'mega_asteroid'];
        }

        const chosenType = typesUnlocked[Math.floor(Math.random() * typesUnlocked.length)];

        // Configure radius & coloring based on type
        let radius = Math.random() * 16 + 12; // default
        let color = '#ff3c00'; // red-orange meteor
        let behavior: 'straight' | 'sine' | 'diagonal' | 'waving' = 'straight';
        const baseObsSpeed = 3 + (state.level * 0.45);

        let x = 0;
        let y = -40;
        let vx = 0;
        let vy = 0;
        let angle = Math.random() * Math.PI * 2;

        if (chosenType === 'airplane') {
          // Airplanes fly horizontally across the screen
          const flyFromLeft = Math.random() < 0.5;
          x = flyFromLeft ? -50 : width + 50;
          y = Math.random() * (height * 0.4) + 60; // troposphere sky heights
          vx = (flyFromLeft ? 1 : -1) * (2.0 + Math.random() * 1.5 + state.level * 0.2);
          vy = 0; // Perfectly straight horizontal flight path!
          radius = 18; // clean uniform radius
          color = Math.random() < 0.5 ? '#f59e0b' : '#e2e8f0'; // orange or metallic white
          angle = vx < 0 ? Math.PI : 0; // face correct travel direction!
          behavior = 'straight';
        } else if (chosenType === 'balloon') {
          // Weather/hot-air balloons rise slowly from bottom or drift
          x = Math.random() * (width - 120) + 60;
          y = height + 40; // float up from below the screen
          vx = (Math.random() - 0.5) * 1.0;
          vy = -(0.8 + Math.random() * 1.2); // floats upwards
          radius = Math.random() * 6 + 15; // 15-21px
          color = ['#ef4444', '#10b981', '#3b82f6', '#ec4899'][Math.floor(Math.random() * 4)];
          behavior = 'waving';
        } else if (chosenType === 'satellite') {
          // Satellites orbit horizontally at very high speed
          const orbitFromLeft = Math.random() < 0.5;
          x = orbitFromLeft ? -50 : width + 50;
          y = Math.random() * (height * 0.35) + 40;
          vx = (orbitFromLeft ? 1 : -1) * (3.8 + Math.random() * 1.8 + state.level * 0.15);
          vy = (Math.random() - 0.5) * 0.2;
          radius = Math.random() * 3 + 13; // 13-16px
          color = '#94a3b8'; // silver space probe color
          behavior = 'straight';
        } else {
          // Space obstacles spawn from top or sides as usual
          const spawnDirRand = Math.random();
          if (state.level >= 3 && spawnDirRand < 0.2) {
            // Left Side Spawn
            x = -30;
            y = Math.random() * (height * 0.65);
            vx = (Math.random() * 2 + 1.5) * (0.8 + state.level * 0.05);
            vy = (Math.random() * 1.5 + 1.0) * (0.8 + state.level * 0.05);
          } else if (state.level >= 3 && spawnDirRand < 0.4) {
            // Right Side Spawn
            x = width + 30;
            y = Math.random() * (height * 0.65);
            vx = -(Math.random() * 2 + 1.5) * (0.8 + state.level * 0.05);
            vy = (Math.random() * 1.5 + 1.0) * (0.8 + state.level * 0.05);
          } else {
            // Top Spawn (Default)
            x = Math.random() * (width - 40) + 20;
            y = -40;
            vx = (Math.random() - 0.5) * (1.5 + state.level * 0.2); // drifting side to side
            vy = baseObsSpeed * (0.75 + Math.random() * 0.5);
          }

          if (chosenType === 'meteor') {
            radius = Math.random() * 22 + 14; // bigger
            color = '#cc7744'; // rocky brown/dark orange
            behavior = Math.random() < 0.3 ? 'diagonal' : 'straight';
          } else if (chosenType === 'comet') {
            radius = Math.random() * 12 + 10; // small fast comets
            color = '#ffaa00'; // gold fiery orange
            behavior = 'diagonal';
            vx = (x < width / 2 ? 2.5 : -2.5) * (1 + state.level * 0.1); // steep diagonal slice
            vy = (baseObsSpeed * 1.3);
          } else if (chosenType === 'plasma_orb') {
            radius = Math.random() * 14 + 10;
            color = '#ff00ff'; // neon magenta
            behavior = 'sine';
          } else if (chosenType === 'laser_drone') {
            radius = 16;
            color = '#bd00ff'; // sharp glowing purple
            behavior = 'waving';
          } else if (chosenType === 'void_crystal') {
            radius = Math.random() * 18 + 12;
            color = '#00ffff'; // icy void cyan
            behavior = 'straight';
          } else if (chosenType === 'mega_asteroid') {
            radius = Math.random() * 15 + 40; // massive size (40px to 55px radius)
            color = '#8a9ba8'; // slate grey rock
            behavior = 'straight';
            vy = baseObsSpeed * 0.45; // slow movement, making it feel fixed and solid
            vx = (Math.random() - 0.5) * 0.3; // tiny horizontal drift
          }
        }

        obstaclesRef.current.push({
          id: Math.random().toString(),
          x,
          y,
          vx,
          vy,
          radius,
          type: chosenType,
          color,
          angle: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.08,
          behavior,
          initialX: x,
          waveAmplitude: Math.random() * 40 + 25,
          waveFrequency: 0.02 + Math.random() * 0.02,
          timeAlive: 0,
          pulseSpeed: 0.03 + Math.random() * 0.03,
        });
      }
    }
  };

  // Update Obstacles, near misses and trigger collision
  const updateObstacles = (width: number, height: number, dt: number) => {
    const state = stateRef.current;
    const dtFactor = dt / 16.666;

    // We process obstacles list backwards to safely splice items
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      const obs = obstaclesRef.current[i];
      obs.timeAlive += dt;

      // Adjust sine wave center dynamically relative to horizontal scrolling!
      if (obs.behavior === 'sine') {
        obs.initialX += -state.playerVx * dtFactor;
        obs.x = obs.initialX + Math.sin(obs.timeAlive * obs.waveFrequency * 0.05) * obs.waveAmplitude;
      } else {
        // Normal horizontal movement + scrolling opposite of player Vx
        obs.x += (obs.vx - state.playerVx) * dtFactor;
      }

      if (obs.behavior === 'waving') {
        obs.x += Math.sin(obs.timeAlive * 0.005) * 1.5 * dtFactor;
      }

      // Base vertical movement + scrolling opposite of player Vy, scaled to match the ground/world vertical scroll exactly! (0.12 * 1.5 = 0.18 ratio)
      obs.y += (obs.vy - state.playerVy * 0.18) * dtFactor;

      if (obs.type !== 'airplane') {
        obs.angle += obs.rotationSpeed * dtFactor;
      }

      // Spawn subtle comet dust particles
      if (obs.type === 'comet' && Math.random() < 0.4) {
        particlesRef.current.push({
          x: obs.x,
          y: obs.y,
          vx: -(obs.vx - state.playerVx) * 0.4 + (Math.random() - 0.5) * 1.5,
          vy: -(obs.vy - state.playerVy) * 0.4 + (Math.random() - 0.5) * 1.5,
          color: obs.color,
          alpha: 0.8,
          size: Math.random() * 3 + 1.5,
          life: 0,
          maxLife: 250,
          type: 'star',
        });
      } else if (obs.type === 'plasma_orb' && Math.random() < 0.25) {
        // pulsing plasma particles
        particlesRef.current.push({
          x: obs.x + (Math.random() - 0.5) * obs.radius,
          y: obs.y + (Math.random() - 0.5) * obs.radius,
          vx: (Math.random() - 0.5) * 2 - state.playerVx * 0.2,
          vy: (Math.random() - 0.5) * 2 - state.playerVy * 0.2,
          color: '#ffffff',
          alpha: 0.6,
          size: 2,
          life: 0,
          maxLife: 200,
          type: 'star',
        });
      }

      // COLLISION DETECTION (Precise circular distance checking)
      const dx = state.playerX - obs.x;
      const dy = state.playerY - obs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const collisionDistance = state.playerRadius + obs.radius;

      if (dist <= collisionDistance) {
        // CRASH EVENT!
        triggerCrash(obs.x, obs.y, obs.color);
        return; // Terminate early as player has died
      }

      // NEAR MISS DETECTION
      // If player passed very close (collision boundary + 30px)
      // and has not near-missed this obstacle yet, and is within passing height
      const nearMissThreshold = collisionDistance + 28;
      if (dist <= nearMissThreshold && !obs.nearMissed) {
        // Only count as near miss if it's a real vertical / sideways dodge pass
        obs.nearMissed = true;
        state.nearMisses += 1;
        
        // Trigger parent near-miss animation
        if (callbacksRef.current.onNearMiss) {
          callbacksRef.current.onNearMiss();
        }

        // Add Floating near-miss notification
        addFloatingText(obs.x, obs.y - 10, '+150 NEAR MISS!', '#00ffff', 14, 800, -1.2);
        
        // Spawn satisfying neon ring of star particles
        spawnNearMissParticles(obs.x, obs.y, obs.color);
      }

      // Clean up out of bounds obstacles
      // Top boundary is safe, left/right/bottom needs buffer
      if (
        obs.y > height + 180 || 
        obs.y < -350 ||
        obs.x < -200 || 
        obs.x > width + 200
      ) {
        obstaclesRef.current.splice(i, 1);
      }
    }
  };

  // Near miss splash particles
  const spawnNearMissParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        color,
        alpha: 1.0,
        size: 3,
        life: 0,
        maxLife: 400,
        type: 'near-miss',
      });
    }
  };

  // Trigger Crash explosion and GameOver state after small delay
  const triggerCrash = (crashX: number, crashY: number, obstacleColor: string) => {
    const state = stateRef.current;
    state.gameState = 'gameover'; // freeze updates

    // Giant screen shake!
    state.screenShake = 22;

    // Spawn rich radial explosion of ship breaking into pieces
    const activeShip = SHIPS.find((s) => s.id === selectedShipId) || SHIPS[0];
    
    // Ship structural fragments explosion
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      particlesRef.current.push({
        x: state.playerX,
        y: state.playerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // upwards bias
        color: Math.random() < 0.6 ? activeShip.color : activeShip.secondaryColor,
        alpha: 1.0,
        size: Math.random() * 6 + 2,
        life: 0,
        maxLife: Math.random() * 1000 + 600,
        type: 'explosion',
      });
    }

    // Spark shower explosion
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 4;
      particlesRef.current.push({
        x: crashX,
        y: crashY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#ffffff',
        alpha: 1.0,
        size: 2,
        life: 0,
        maxLife: Math.random() * 500 + 300,
        type: 'explosion',
      });
    }

    // Trigger Game Over after 1200ms delay to let user enjoy the spectacular particle explosion
    setTimeout(() => {
      const finalStats: GameStats = {
        score: state.score,
        timeSurvived: Math.floor(state.timeSurvived / 1000), // convert to seconds
        nearMisses: state.nearMisses,
      };

      // Save highscore if broken
      try {
        const stored = localStorage.getItem('endless_runner_highscores');
        let records: HighscoreRecord[] = stored ? JSON.parse(stored) : [];
        const isBetter = records.length === 0 || state.score > Math.max(...records.map(r => r.score));
        
        const newRecord: HighscoreRecord = {
          score: state.score,
          date: new Date().toLocaleDateString('de-DE'),
          shipId: selectedShipId,
          timeSurvived: finalStats.timeSurvived,
        };

        records.push(newRecord);
        // Sort high to low, keep top 10
        records.sort((a, b) => b.score - a.score);
        records = records.slice(0, 10);
        localStorage.setItem('endless_runner_highscores', JSON.stringify(records));
      } catch (err) {
        console.error('Error saving highscore', err);
      }

      callbacksRef.current.onGameOver(finalStats);
    }, 1200);
  };

  // Update Particles
  const updateParticles = (dt: number) => {
    const dtFactor = dt / 16.666;
    const state = stateRef.current;

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.life += dt;

      // Physics integration
      // Engine, near-miss, and explosion particles drift relative to the scrolling world
      if (p.type === 'engine' || p.type === 'near-miss' || p.type === 'explosion') {
        p.x += (p.vx - state.playerVx) * dtFactor;
        p.y += (p.vy - state.playerVy) * dtFactor;
      } else {
        p.x += p.vx * dtFactor;
        p.y += p.vy * dtFactor;
      }

      if (p.type === 'engine') {
        if (selectedExhaustId === 'nebula') {
          p.size += 0.08 * dtFactor;
          p.vx *= Math.pow(0.97, dtFactor);
          p.vy *= Math.pow(0.97, dtFactor);
        } else if (selectedExhaustId === 'lightning') {
          p.x += (Math.random() - 0.5) * 3 * dtFactor;
          p.y += (Math.random() - 0.5) * 3 * dtFactor;
        }
      }

      // Slow down explosion pieces with drag
      if (p.type === 'explosion') {
        p.vx *= Math.pow(0.96, dtFactor);
        p.vy *= Math.pow(0.96, dtFactor);
      }

      // Exhaust/Engine particles bounce off the starting planet ground!
      if (p.type === 'engine' && state.altitude <= 800) {
        const canvasWidth = canvasRef.current?.width || 800;
        const pVirtualX = state.playerVirtualX + (p.x - canvasWidth / 2);
        const groundAltAtX = getGroundAltitude(pVirtualX);
        const groundYAtX = state.playerY + 23 + (state.altitude - groundAltAtX) * 1.5;

        if (p.y >= groundYAtX) {
          p.y = groundYAtX - 1.5; // push slightly above ground
          p.vy = -Math.abs(p.vy) * 0.45; // bounce up
          // Scatter horizontally away from center
          const scatterDirection = p.x > canvasWidth / 2 ? 1.0 : -1.0;
          p.vx = p.vx * 0.5 + scatterDirection * (Math.random() * 2.5 + 1.5);
        }
      }

      // Fade alpha
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife) {
        particlesRef.current.splice(i, 1);
      }
    }
  };

  // Update Floating Texts
  const updateFloatingTexts = (dt: number) => {
    const dtFactor = dt / 16.666;

    for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
      const ft = floatingTextsRef.current[i];
      ft.life += dt;

      // Float upwards gently
      ft.y += ft.vy * dtFactor;

      // Fade alpha
      ft.alpha = Math.max(0, 1 - ft.life / ft.maxLife);

      if (ft.life >= ft.maxLife) {
        floatingTextsRef.current.splice(i, 1);
      }
    }
  };

  // Add a new Floating Text
  const addFloatingText = (
    x: number,
    y: number,
    text: string,
    color: string,
    size = 14,
    maxLife = 800,
    vy = -1.0
  ) => {
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      x,
      y,
      text,
      color,
      alpha: 1.0,
      size,
      life: 0,
      maxLife,
      vy,
    });
  };

  // Draw Particles
  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    particlesRef.current.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      
      if (p.type === 'near-miss' || p.type === 'explosion') {
        // Glowing flare look
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
      }

      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  };

  // Draw Obstacles
  const drawObstacles = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    const time = performance.now();

    obstaclesRef.current.forEach((obs) => {
      ctx.save();
      ctx.translate(obs.x, obs.y);
      ctx.rotate(obs.angle);

      // Create glowing aesthetic for glowing neon obstacles
      ctx.shadowColor = obs.color;
      
      if (obs.type === 'airplane') {
        // Draw twin-wing plane
        ctx.shadowBlur = 4;
        ctx.fillStyle = obs.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;

        // Fuselage
        ctx.beginPath();
        ctx.ellipse(0, 0, obs.radius, obs.radius * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Main Wings (extending up and down)
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(-obs.radius * 0.2, -obs.radius * 0.2);
        ctx.lineTo(-obs.radius * 0.1, -obs.radius * 1.3);
        ctx.lineTo(obs.radius * 0.1, -obs.radius * 1.3);
        ctx.lineTo(obs.radius * 0.1, -obs.radius * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-obs.radius * 0.2, obs.radius * 0.2);
        ctx.lineTo(-obs.radius * 0.1, obs.radius * 1.3);
        ctx.lineTo(obs.radius * 0.1, obs.radius * 1.3);
        ctx.lineTo(obs.radius * 0.1, obs.radius * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cockpit window
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(obs.radius * 0.4, -obs.radius * 0.05, obs.radius * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Propeller spinner (optional but cute)
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(obs.radius, -obs.radius * 0.45);
        ctx.lineTo(obs.radius, obs.radius * 0.45);
        ctx.stroke();
      } else if (obs.type === 'balloon') {
        // Draw a hot air balloon / weather balloon
        ctx.shadowBlur = 6;
        ctx.fillStyle = obs.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;

        // Balloon envelope (slightly teardrop/ellipsoid shape)
        ctx.beginPath();
        ctx.arc(0, -obs.radius * 0.3, obs.radius * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Stripes on balloon
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, -obs.radius * 0.3, obs.radius * 0.3, obs.radius * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();

        // Lines to basket
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-obs.radius * 0.3, obs.radius * 0.4);
        ctx.lineTo(-obs.radius * 0.15, obs.radius * 0.95);
        ctx.moveTo(obs.radius * 0.3, obs.radius * 0.4);
        ctx.lineTo(obs.radius * 0.15, obs.radius * 0.95);
        ctx.stroke();

        // Basket
        ctx.fillStyle = '#b45309'; // brown basket
        ctx.beginPath();
        ctx.rect(-obs.radius * 0.2, obs.radius * 0.95, obs.radius * 0.4, obs.radius * 0.3);
        ctx.fill();
        ctx.stroke();
      } else if (obs.type === 'satellite') {
        // Draw high tech orbital satellite
        ctx.shadowBlur = 8;
        ctx.fillStyle = obs.color;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;

        // Central core hexagon
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const a = (j * Math.PI) / 3;
          const rx = Math.cos(a) * obs.radius * 0.55;
          const ry = Math.sin(a) * obs.radius * 0.55;
          if (j === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Solar panels (left and right wings)
        ctx.fillStyle = '#0284c7'; // solar panel blue
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.fillRect(-obs.radius * 1.5, -obs.radius * 0.25, obs.radius * 0.8, obs.radius * 0.5);
        ctx.strokeRect(-obs.radius * 1.5, -obs.radius * 0.25, obs.radius * 0.8, obs.radius * 0.5);

        ctx.fillRect(obs.radius * 0.7, -obs.radius * 0.25, obs.radius * 0.8, obs.radius * 0.5);
        ctx.strokeRect(obs.radius * 0.7, -obs.radius * 0.25, obs.radius * 0.8, obs.radius * 0.5);

        // Grid lines on solar panels
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(-obs.radius * 1.1, -obs.radius * 0.25);
        ctx.lineTo(-obs.radius * 1.1, obs.radius * 0.25);
        ctx.moveTo(obs.radius * 1.1, -obs.radius * 0.25);
        ctx.lineTo(obs.radius * 1.1, obs.radius * 0.25);
        ctx.stroke();

        // Dish antenna
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -obs.radius * 0.4, obs.radius * 0.3, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -obs.radius * 0.45);
        ctx.lineTo(0, -obs.radius * 0.75);
        ctx.stroke();
      } else if (obs.type === 'plasma_orb') {
        // Pulsing glow size
        const pulse = Math.sin(time * obs.pulseSpeed) * 3;
        ctx.shadowBlur = 14 + pulse;

        const radGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, obs.radius + pulse);
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.3, obs.color);
        radGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(0, 0, obs.radius + pulse, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === 'comet') {
        // High speed glowing flame shape
        ctx.shadowBlur = 8;
        ctx.fillStyle = obs.color;
        
        ctx.beginPath();
        ctx.moveTo(-obs.radius, 0);
        ctx.lineTo(obs.radius * 0.4, -obs.radius * 0.6);
        ctx.lineTo(obs.radius * 1.2, 0); // pointing tip forwards
        ctx.lineTo(obs.radius * 0.4, obs.radius * 0.6);
        ctx.closePath();
        ctx.fill();

        // Inner hot core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(obs.radius * 0.2, 0, obs.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === 'laser_drone') {
        // Sci-Fi drone shape
        ctx.shadowBlur = 10;
        ctx.strokeStyle = obs.color;
        ctx.lineWidth = 2.5;
        ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';

        // Draw futuristic triangle frame
        ctx.beginPath();
        ctx.moveTo(0, -obs.radius);
        ctx.lineTo(obs.radius * 0.8, obs.radius * 0.6);
        ctx.lineTo(-obs.radius * 0.8, obs.radius * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Central glowing red sensor
        ctx.fillStyle = '#ff003c';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw side antennae arcs
        ctx.beginPath();
        ctx.arc(0, 0, obs.radius * 1.3, Math.PI * 0.8, Math.PI * 2.2);
        ctx.stroke();
      } else if (obs.type === 'void_crystal') {
        // Crystal shards geometry
        ctx.shadowBlur = 10;
        ctx.strokeStyle = obs.color;
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(10, 25, 30, 0.9)';

        ctx.beginPath();
        ctx.moveTo(0, -obs.radius * 1.2); // top spike
        ctx.lineTo(obs.radius * 0.6, -obs.radius * 0.2);
        ctx.lineTo(obs.radius * 0.8, obs.radius * 0.4);
        ctx.lineTo(0, obs.radius * 1.1); // bottom spike
        ctx.lineTo(-obs.radius * 0.8, obs.radius * 0.4);
        ctx.lineTo(-obs.radius * 0.6, -obs.radius * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner energy spine line
        ctx.beginPath();
        ctx.moveTo(0, -obs.radius * 0.8);
        ctx.lineTo(0, obs.radius * 0.8);
        ctx.stroke();
      } else if (obs.type === 'mega_asteroid') {
        // MEGA ASTEROID (Giant, heavy space rock/debris in the foreground)
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#ff6a00'; // Molten energy core glow
        ctx.strokeStyle = '#64748b'; // Slate border
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(15, 20, 28, 0.96)'; // Extra solid dark body

        // Draw massive highly-detailed jagged polygon
        ctx.beginPath();
        const pts = 12;
        const seedPoints: number[] = [];
        const seed = parseFloat(obs.id) || 0.5;
        for (let j = 0; j < pts; j++) {
          const angle = (j * Math.PI * 2) / pts;
          const noise = 0.82 + Math.sin(j * 2.3 + seed * 10) * 0.14;
          const rx = Math.cos(angle) * obs.radius * noise;
          const ry = Math.sin(angle) * obs.radius * noise;
          if (j === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
          seedPoints.push(noise);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing thermal veins
        ctx.strokeStyle = '#ff6a00';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let j = 0; j < pts - 1; j += 2) {
          const angle1 = (j * Math.PI * 2) / pts;
          const angle2 = ((j + 1) * Math.PI * 2) / pts;
          const r1 = obs.radius * seedPoints[j] * 0.35;
          const r2 = obs.radius * seedPoints[j+1] * 0.72;
          ctx.moveTo(Math.cos(angle1) * r1, Math.sin(angle1) * r1);
          ctx.lineTo(Math.cos(angle2) * r2, Math.sin(angle2) * r2);
        }
        ctx.stroke();

        // Core thermal power grid glow
        const coreGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, obs.radius * 0.42);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.3, '#ffcc00');
        coreGrad.addColorStop(0.7, '#ff4400');
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, obs.radius * 0.42, 0, Math.PI * 2);
        ctx.fill();

        // Surface craters and structural industrial details
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-obs.radius * 0.3, -obs.radius * 0.2, obs.radius * 0.15, 0, Math.PI * 2);
        ctx.arc(obs.radius * 0.35, obs.radius * 0.25, obs.radius * 0.18, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // METEOR (Rough, procedural-looking polygon rock)
        ctx.shadowBlur = 5;
        ctx.strokeStyle = obs.color;
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(25, 20, 18, 0.9)';

        // Draw custom dented polygon rock
        ctx.beginPath();
        const pts = 8;
        for (let j = 0; j < pts; j++) {
          const angle = (j * Math.PI * 2) / pts;
          // create jagged edge
          const jagFactor = 0.85 + (Math.sin(j * 1.7) * 0.12);
          const rx = Math.cos(angle) * obs.radius * jagFactor;
          const ry = Math.sin(angle) * obs.radius * jagFactor;
          if (j === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw internal crater/lines for rocky texturing
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.arc(-obs.radius * 0.2, -obs.radius * 0.2, obs.radius * 0.25, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    });
    ctx.restore();
  };

  // Draw Floating Texts
  const drawFloatingTexts = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    floatingTextsRef.current.forEach((ft) => {
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = ft.alpha;
      
      // Let's use Orbitron for floating near-miss alerts!
      ctx.font = `bold ${ft.size}px "Orbitron", "Inter", sans-serif`;
      ctx.textAlign = 'center';
      
      // Shadow for extreme visibility
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.restore();
  };

  // Draw Mobile Touch Controls UI indicators (visual left/right halves overlay)
  const drawTouchIndicators = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Only render subtle panels when touched
    const state = stateRef.current;
    if (state.gameState !== 'playing') return;

    const leftActive = touchStateRef.current.left;
    const rightActive = touchStateRef.current.right;

    ctx.save();
    if (leftActive) {
      const gradLeft = ctx.createLinearGradient(0, 0, width * 0.2, 0);
      gradLeft.addColorStop(0, 'rgba(0, 255, 204, 0.07)');
      gradLeft.addColorStop(1, 'rgba(0, 255, 204, 0)');
      ctx.fillStyle = gradLeft;
      ctx.fillRect(0, 0, width / 2, height);

      // Side glow bar
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(1.5, 0);
      ctx.lineTo(1.5, height);
      ctx.stroke();
    }

    if (rightActive) {
      const gradRight = ctx.createLinearGradient(width, 0, width * 0.8, 0);
      gradRight.addColorStop(0, 'rgba(255, 0, 127, 0.07)');
      gradRight.addColorStop(1, 'rgba(255, 0, 127, 0)');
      ctx.fillStyle = gradRight;
      ctx.fillRect(width / 2, 0, width / 2, height);

      // Side glow bar
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width - 1.5, 0);
      ctx.lineTo(width - 1.5, height);
      ctx.stroke();
    }
    ctx.restore();
  };



  // Draw futuristic scrolling altimeter scale HUD on the right side of the screen
  const drawAltimeter = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current;
    if (state.gameState !== 'playing' && state.gameState !== 'paused') return;

    ctx.save();
    const x = width - 50; // 50px from right margin
    const centerY = height / 2;
    const tapeHeight = height * 0.45; // 45% of screen height for the scale

    // Draw background glass/container for the altimeter
    ctx.fillStyle = 'rgba(2, 5, 15, 0.65)';
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x - 30, centerY - tapeHeight / 2 - 10, 70, tapeHeight + 20, 10);
    } else {
      ctx.rect(x - 30, centerY - tapeHeight / 2 - 10, 70, tapeHeight + 20);
    }
    ctx.fill();
    ctx.stroke();

    // Draw vertical tick marks and scale
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.35)';
    ctx.lineWidth = 1;
    ctx.font = '10px "JetBrains Mono", "Orbitron", monospace';
    ctx.fillStyle = 'rgba(0, 255, 204, 0.8)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const tickSpacing = 40; // pixels per 100 meters of altitude
    const startAlt = Math.floor((state.altitude - 500) / 100) * 100;
    const endAlt = Math.ceil((state.altitude + 500) / 100) * 100;

    ctx.save();
    // Clip drawing area to the tape boundary
    ctx.beginPath();
    ctx.rect(x - 30, centerY - tapeHeight / 2, 70, tapeHeight);
    ctx.clip();

    for (let alt = startAlt; alt <= endAlt; alt += 50) {
      if (alt < 0) continue;

      // Calculate relative Y coordinate on tape
      const dy = (state.altitude - alt) * (tickSpacing / 100);
      const y = centerY + dy;

      const isMajor = alt % 100 === 0;
      const tickWidth = isMajor ? 12 : 6;

      ctx.beginPath();
      ctx.moveTo(x + 35, y);
      ctx.lineTo(x + 35 - tickWidth, y);
      ctx.stroke();

      if (isMajor) {
        ctx.fillText(alt.toString(), x + 15, y);
      }
    }
    ctx.restore();

    // Draw central pointer triangle
    ctx.fillStyle = '#00ffcc';
    ctx.beginPath();
    ctx.moveTo(x + 35, centerY);
    ctx.lineTo(x + 23, centerY - 6);
    ctx.lineTo(x + 23, centerY + 6);
    ctx.closePath();
    ctx.fill();

    // Draw digital altimeter readout box above the scale
    ctx.fillStyle = 'rgba(2, 5, 15, 0.85)';
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x - 45, centerY - tapeHeight / 2 - 45, 100, 26, 6);
    } else {
      ctx.rect(x - 45, centerY - tapeHeight / 2 - 45, 100, 26);
    }
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 11px "Orbitron", sans-serif';
    ctx.fillStyle = '#00ffcc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.floor(state.altitude)} m`, x + 5, centerY - tapeHeight / 2 - 32);

    // Label "HÖHE" or "ENTFERNUNG ZU PLANET" (after reaching space)
    const isSpace = state.altitude >= 4000;
    const label = isSpace ? 'ENTFERNUNG ZU PLANET' : 'HÖHE';
    ctx.font = isSpace ? '6px "Orbitron", sans-serif' : '8px "Orbitron", sans-serif';
    ctx.fillStyle = 'rgba(0, 255, 204, 0.6)';
    ctx.fillText(label, x + 5, centerY - tapeHeight / 2 - 52);

    ctx.restore();
  };

  // Draw futuristic speedometer in the bottom-right corner
  const drawSpeedometer = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current;
    if (state.gameState !== 'playing' && state.gameState !== 'paused') return;

    ctx.save();
    
    // Position center in bottom-right corner
    const cx = width - 80;
    const cy = height - 80;
    const r = 36;

    // Calculate speed (scalar of playerVx and playerVy)
    const speedMagnitude = Math.sqrt(state.playerVx * state.playerVx + state.playerVy * state.playerVy);
    const speedKmh = Math.round(speedMagnitude * 120);
    const maxSpeedDisplay = 1000;
    const fillPercent = Math.min(1, speedKmh / maxSpeedDisplay);

    // Speed-dependent colors for extreme feedback!
    let neonColor = '#00ffcc'; // normal
    if (speedKmh > 750) {
      neonColor = '#ff3300'; // extreme speed warning
    } else if (speedKmh > 400) {
      neonColor = '#ffcc00'; // high speed warning
    }

    // 1. Draw dial glass circle backing
    ctx.fillStyle = 'rgba(2, 5, 15, 0.65)';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Draw empty gauge track (radius r) from 135deg (0.75 * PI) to 405deg (2.25 * PI)
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const totalAngleRange = endAngle - startAngle;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.stroke();

    // 3. Draw active speed arc with neon glow
    if (fillPercent > 0.01) {
      ctx.strokeStyle = neonColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.shadowColor = neonColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + totalAngleRange * fillPercent);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow
    }

    // 4. Draw outer dial tick markers
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.25)';
    ctx.lineWidth = 1;
    const ticksCount = 7;
    for (let i = 0; i < ticksCount; i++) {
      const angle = startAngle + (totalAngleRange * (i / (ticksCount - 1)));
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const innerR = r + 4;
      const outerR = r + 8;
      ctx.beginPath();
      ctx.moveTo(cx + cos * innerR, cy + sin * innerR);
      ctx.lineTo(cx + cos * outerR, cy + sin * outerR);
      ctx.stroke();
    }

    // 5. Digital value display inside
    ctx.font = 'bold 15px "Orbitron", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${speedKmh}`, cx, cy - 3);

    // Unit "km/h"
    ctx.font = '7px "JetBrains Mono", monospace';
    ctx.fillStyle = neonColor;
    ctx.fillText('km/h', cx, cy + 9);

    // Label "VELOCITY"
    ctx.font = '6px "Orbitron", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('VELOCITY', cx, cy - 18);

    ctx.restore();
  };

  // Deterministic procedural mountain generator based on state seeds
  const getMountainHeight = (worldX: number, layer: number): number => {
    const state = stateRef.current;
    const seed = layer === 1 ? (state.mountainSeed1 || 0) : (state.mountainSeed2 || 0);
    
    if (layer === 1) {
      // Distant mountains: higher peaks, smoother waves
      const wave1 = Math.sin((worldX + seed) * 0.0003) * 110;
      const wave2 = Math.cos((worldX + seed * 1.5) * 0.00095) * 45;
      const wave3 = Math.sin((worldX + seed * 0.7) * 0.0024) * 16;
      const wave4 = Math.cos((worldX + seed * 2.1) * 0.0055) * 6;
      return 130 + wave1 + wave2 + wave3 + wave4;
    } else {
      // Near mountains: lower peaks, sharper waves
      const wave1 = Math.sin((worldX + seed) * 0.0005) * 70;
      const wave2 = Math.cos((worldX + seed * 1.3) * 0.0014) * 28;
      const wave3 = Math.sin((worldX + seed * 0.8) * 0.0035) * 12;
      const wave4 = Math.cos((worldX + seed * 2.5) * 0.008) * 4;
      return 85 + wave1 + wave2 + wave3 + wave4;
    }
  };

  // Draw starting planet surface and detailed futuristic launchpad
  const drawStartingPlanet = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current;
    if (state.altitude > 800) return; // Completely scrolls out of view

    // Calculate ground screen position
    const groundY = state.playerY + 23 + (state.altitude - 400) * 1.5;

    ctx.save();

    const planetCenterX = width / 2 - state.playerVirtualX;

    // 1. Draw distant mountain silhouettes on the planetary horizon
    // Mountains use slower scrolling (0.9x) for extra 2.5D visual depth
    const horizonY = state.playerY + 23 + (state.altitude - 400) * 0.9;
    
    // Distant mountains (layer 1)
    ctx.fillStyle = '#110c2e'; // Deep sunset twilight purple mountain shade
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width + 15; x += 15) {
      const worldX = (state.playerVirtualX * 0.35) + (x - width / 2);
      const mHeight = getMountainHeight(worldX, 1);
      const yVal = horizonY - mHeight;
      if (x === 0) {
        ctx.lineTo(x, yVal);
      } else {
        ctx.lineTo(x, yVal);
      }
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Foreground mountains layer (layer 2)
    ctx.fillStyle = '#060418'; // Extremely dark navy silhouette
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width + 15; x += 15) {
      const worldX = (state.playerVirtualX * 0.75) + (x - width / 2);
      const mHeight = getMountainHeight(worldX, 2);
      const yVal = horizonY - mHeight;
      if (x === 0) {
        ctx.lineTo(x, yVal);
      } else {
        ctx.lineTo(x, yVal);
      }
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // 2. Draw the infinite wavy planetary crust
    ctx.fillStyle = '#030209'; // Near-black planetary bedrock
    ctx.strokeStyle = '#311052'; // Purple glowing crust border
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width + 10; x += 10) {
      const vX = state.playerVirtualX + (x - width / 2);
      const groundAlt = getGroundAltitude(vX);
      const yVal = state.playerY + 23 + (state.altitude - groundAlt) * 1.5;
      if (x === 0) {
        ctx.moveTo(x, yVal);
      } else {
        ctx.lineTo(x, yVal);
      }
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Draw landing runway / sci-fi launch platform
    const padWidth = 280;
    const padLeft = planetCenterX - padWidth / 2;
    const padRight = planetCenterX + padWidth / 2;

    // Platform base glass/alloy body
    const platformGrad = ctx.createLinearGradient(padLeft, groundY, padRight, groundY + 30);
    platformGrad.addColorStop(0, '#090d16');
    platformGrad.addColorStop(0.5, '#1e1b4b');
    platformGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = platformGrad;
    ctx.strokeStyle = '#00ffcc'; // Cyber cyan borders
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.rect(padLeft, groundY, padWidth, 24);
    ctx.fill();
    ctx.stroke();

    // Landing "H" markings
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.4)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(planetCenterX - 12, groundY + 4);
    ctx.lineTo(planetCenterX - 12, groundY + 20);
    ctx.moveTo(planetCenterX + 12, groundY + 4);
    ctx.lineTo(planetCenterX + 12, groundY + 20);
    ctx.moveTo(planetCenterX - 12, groundY + 12);
    ctx.lineTo(planetCenterX + 12, groundY + 12);
    ctx.stroke();

    // Blinking beacons on launch towers/edges
    const isLit = Math.floor(Date.now() / 300) % 2 === 0;
    ctx.fillStyle = isLit ? '#f43f5e' : '#4c0519'; // Neon rose strobe
    ctx.beginPath();
    ctx.arc(padLeft + 12, groundY + 12, 4, 0, Math.PI * 2);
    ctx.arc(padRight - 12, groundY + 12, 4, 0, Math.PI * 2);
    ctx.fill();

    if (isLit) {
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(padLeft + 12, groundY + 12, 3, 0, Math.PI * 2);
      ctx.arc(padRight - 12, groundY + 12, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Glowing cyan guideline led strips
    ctx.fillStyle = isLit ? '#00ffcc' : 'rgba(0, 255, 204, 0.25)';
    ctx.beginPath();
    for (let xOffset = -padWidth / 2 + 35; xOffset <= padWidth / 2 - 35; xOffset += 35) {
      if (Math.abs(xOffset) > 15) {
        ctx.arc(planetCenterX + xOffset, groundY + 12, 2.5, 0, Math.PI * 2);
      }
    }
    ctx.fill();

    // 4. Launch Support Tower structure
    const towerX = padLeft - 26;
    ctx.strokeStyle = '#1e1b4b';
    ctx.fillStyle = '#09071f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(towerX, groundY - 120, 20, 120);
    ctx.fill();
    ctx.stroke();

    // Truss bracing inside the support tower
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let ty = groundY - 120; ty < groundY; ty += 15) {
      ctx.moveTo(towerX, ty);
      ctx.lineTo(towerX + 20, ty + 15);
      ctx.moveTo(towerX + 20, ty);
      ctx.lineTo(towerX, ty + 15);
    }
    ctx.stroke();

    // Flashing antenna hazard light
    ctx.fillStyle = isLit ? '#00ffcc' : '#042f2e';
    ctx.beginPath();
    ctx.arc(towerX + 10, groundY - 126, 4.5, 0, Math.PI * 2);
    ctx.fill();
    if (isLit) {
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(towerX + 10, groundY - 126, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  };

  return (
    <div id="game_container" ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden select-none bg-[#02050f]">
      {/* HTML5 Canvas */}
      <canvas id="game_canvas" ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
