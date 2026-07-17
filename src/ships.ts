import { Ship } from './types';

export const SHIPS: Ship[] = [
  {
    id: 'nebula_interceptor',
    name: 'Nebula Interceptor',
    description: 'Schnittiger Delta-Flügler für maximale Wendigkeit im dichten Trümmerfeld.',
    color: '#00ffcc', // Cyan
    secondaryColor: '#9900ff', // Purple
    statSpeed: 8,
    statThrust: 7,
    statHandling: 9,
    specialAbility: 'Wendig & Flexibel',
    designId: 1,
  },
  {
    id: 'quantum_phoenix',
    name: 'Quantum Phoenix',
    description: 'Besitzt hocheffiziente Triebwerke für extremen Schub und rasante Beschleunigung.',
    color: '#ff3300', // Neon Orange/Red
    secondaryColor: '#ffaa00', // Gold
    statSpeed: 9,
    statThrust: 10,
    statHandling: 6,
    specialAbility: 'Mega-Schubkraft',
    designId: 2,
  },
  {
    id: 'solar_flare',
    name: 'Solar Flare',
    description: 'Nutzt Solarkonverter für konstanten Auftrieb und gleitendes Ausweichen.',
    color: '#ffcc00', // Warm Gold
    secondaryColor: '#ff0055', // Hot Pink
    statSpeed: 7,
    statThrust: 8,
    statHandling: 8,
    specialAbility: 'Solar-Schwebeschild',
    designId: 3,
  },
  {
    id: 'vortex_shadow',
    name: 'Vortex Shadow',
    description: 'Spionage-Gleiter mit geteilter Triebwerkssignatur für exzellente Stabilisierung.',
    color: '#39ff14', // Neon Green
    secondaryColor: '#00ffff', // Cyan
    statSpeed: 7,
    statThrust: 6,
    statHandling: 10,
    specialAbility: 'Ultra-Präzise Drifts',
    designId: 4,
  },
  {
    id: 'hyperion_vanguard',
    name: 'Hyperion Vanguard',
    description: 'Schwerer Prototyp mit robusten Flankenspoilern und starker Gravitationsbremse.',
    color: '#0066ff', // Neon Blue
    secondaryColor: '#00ffcc', // Mint
    statSpeed: 6,
    statThrust: 9,
    statHandling: 7,
    specialAbility: 'Trägheitsdämpfer',
    designId: 5,
  },
  {
    id: 'cyber_wraith',
    name: 'Cyber Wraith',
    description: 'Agiler Diamant-Rumpf mit asymmetrischen Energieleitern für schnelle Drifts.',
    color: '#ff007f', // Deep Pink
    secondaryColor: '#ffffff', // White
    statSpeed: 10,
    statThrust: 7,
    statHandling: 7,
    specialAbility: 'Hypersound-Gleiter',
    designId: 6,
  },
  {
    id: 'zenith_specter',
    name: 'Zenith Specter',
    description: 'Ausgestattet mit synchronisierten Doppelflügeln für maximale Kontrolle.',
    color: '#bd00ff', // Violet
    secondaryColor: '#ffea00', // Neon Yellow
    statSpeed: 8,
    statThrust: 8,
    statHandling: 8,
    specialAbility: 'Harmonische Dynamik',
    designId: 7,
  },
  {
    id: 'void_reaver',
    name: 'Void Reaver',
    description: 'Mysteriöse außerirdische Technologie mit schwebenden Kristall-Triebwerken.',
    color: '#13ffc0', // Emerald Green-Blue
    secondaryColor: '#5c00ff', // Indigo
    statSpeed: 9,
    statThrust: 6,
    statHandling: 8,
    specialAbility: 'Kollaps-Kern',
    designId: 8,
  },
  {
    id: 'chronos_raider',
    name: 'Chronos Raider',
    description: 'Besitzt rotierende Energie-Bögen für ein stabileres Navigationsfeld.',
    color: '#e2f702', // Lime-Yellow
    secondaryColor: '#ff4b00', // Vermilion
    statSpeed: 8,
    statThrust: 9,
    statHandling: 7,
    specialAbility: 'Temporale Balance',
    designId: 9,
  },
  {
    id: 'aegis_sentinel',
    name: 'Aegis Sentinel',
    description: 'Gepanzertes Hexagonal-Chassis mit umlaufendem Plasma-Schutzring.',
    color: '#ff003c', // Crimson
    secondaryColor: '#00ff66', // Spring Green
    statSpeed: 5,
    statThrust: 10,
    statHandling: 8,
    specialAbility: 'Erhöhte Abprall-Kontrolle',
    designId: 10,
  }
];

// Helper to draw a glowing path on Canvas
function drawGlowingPath(
  ctx: CanvasRenderingContext2D,
  color: string,
  drawFn: () => void,
  glowSize = 10
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = glowSize;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  drawFn();
  ctx.stroke();
  ctx.restore();
}

// Draw the ship based on designId
export function drawShip(
  ctx: CanvasRenderingContext2D,
  designId: number,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  secondaryColor: string,
  engineLeft: boolean,
  engineRight: boolean,
  time: number,
  angle: number = 0
) {
  const w = width;
  const h = height;
  const halfW = w / 2;
  const halfH = h / 2;

  // Let's create an ambient subtle floating offset to make it look alive
  const floatOffset = Math.sin(time * 0.0025) * 1.5;
  const shipY = y + floatOffset;

  ctx.save();
  // Translate to the ship's position and rotate
  ctx.translate(x, shipY);
  ctx.rotate(angle);

  // Helper to draw a thruster flame relative to translated (0, 0)
  const drawFlame = (offsetX: number, offsetY: number) => {
    ctx.save();
    const flameHeight = h * (0.45 + Math.random() * 0.4);
    const gradient = ctx.createLinearGradient(offsetX, offsetY, offsetX, offsetY + flameHeight);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, secondaryColor);
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.shadowColor = secondaryColor;
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.moveTo(offsetX - w * 0.12, offsetY - 2);
    ctx.quadraticCurveTo(
      offsetX + (Math.random() - 0.5) * 6,
      offsetY + flameHeight,
      offsetX + w * 0.12,
      offsetY - 2
    );
    ctx.lineTo(offsetX, offsetY - 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // 1. Draw Thruster Flame / Trails
  if (engineLeft) {
    // Left engine fires (located on the left wing/side), pushes ship to the right (clockwise torque)
    drawFlame(-halfW * 0.5, halfH - 2);
  }
  if (engineRight) {
    // Right engine fires (located on the right wing/side), pushes ship to the left (counterclockwise torque)
    drawFlame(halfW * 0.5, halfH - 2);
  }

  // Draw basic passive ion engine trail sparks
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.4;
  ctx.fillRect(-2, halfH, 4, 3 + Math.sin(time * 0.01) * 3);
  ctx.restore();

  // 2. Draw Ship hulls based on design ID (drawn centered around (0, 0))
  switch (designId) {
    case 1: // Nebula Interceptor - Sleek Delta Wing
      drawGlowingPath(ctx, color, () => {
        // Main hull
        ctx.moveTo(0, -halfH); // nose
        ctx.lineTo(halfW, halfH * 0.6); // right wing tip
        ctx.lineTo(halfW * 0.4, halfH * 0.4); // right inner
        ctx.lineTo(0, halfH * 0.8); // back center
        ctx.lineTo(-halfW * 0.4, halfH * 0.4); // left inner
        ctx.lineTo(-halfW, halfH * 0.6); // left wing tip
        ctx.closePath();
      });
      // Canopy (Cockpit)
      drawGlowingPath(ctx, secondaryColor, () => {
        ctx.moveTo(0, -halfH * 0.5);
        ctx.lineTo(w * 0.1, 0);
        ctx.lineTo(0, halfH * 0.2);
        ctx.lineTo(-w * 0.1, 0);
        ctx.closePath();
      });
      break;

    case 2: // Quantum Phoenix - Forward swept wings
      drawGlowingPath(ctx, color, () => {
        ctx.moveTo(0, -halfH); // nose
        ctx.lineTo(w * 0.15, -halfH * 0.3); // right inner neck
        ctx.lineTo(halfW, -halfH * 0.1); // right forward-swept wingtip
        ctx.lineTo(halfW * 0.7, halfH * 0.6); // right wingback
        ctx.lineTo(w * 0.1, halfH * 0.3); // right base
        ctx.lineTo(0, halfH * 0.7); // back
        ctx.lineTo(-w * 0.1, halfH * 0.3); // left base
        ctx.lineTo(-halfW * 0.7, halfH * 0.6); // left wingback
        ctx.lineTo(-halfW, -halfH * 0.1); // left forward-swept wingtip
        ctx.lineTo(-w * 0.15, -halfH * 0.3);
        ctx.closePath();
      });
      // Plasma fire core
      ctx.save();
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.arc(0, 2, w * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;

    case 3: // Solar Flare - Ring energy core
      // Outer solar ring
      ctx.save();
      ctx.strokeStyle = secondaryColor;
      ctx.shadowColor = secondaryColor;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, halfW * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Inner delta craft
      drawGlowingPath(ctx, color, () => {
        ctx.moveTo(0, -halfH * 0.9);
        ctx.lineTo(halfW * 0.5, halfH * 0.5);
        ctx.lineTo(0, halfH * 0.2);
        ctx.lineTo(-halfW * 0.5, halfH * 0.5);
        ctx.closePath();
      });
      break;

    case 4: // Vortex Shadow - Triple prong stealth
      drawGlowingPath(ctx, color, () => {
        // 3 prongs at front
        ctx.moveTo(0, -halfH); // Middle prong tip
        ctx.lineTo(w * 0.08, -halfH * 0.3);
        ctx.lineTo(halfW * 0.4, -halfH * 0.8); // Right prong tip
        ctx.lineTo(halfW * 0.5, 0);
        ctx.lineTo(halfW, halfH * 0.7); // Right wing back
        ctx.lineTo(0, halfH * 0.4); // Back center
        ctx.lineTo(-halfW, halfH * 0.7); // Left wing back
        ctx.lineTo(-halfW * 0.5, 0);
        ctx.lineTo(-halfW * 0.4, -halfH * 0.8); // Left prong tip
        ctx.lineTo(-w * 0.08, -halfH * 0.3);
        ctx.closePath();
      });
      break;

    case 5: // Hyperion Vanguard - Bulky shield style
      drawGlowingPath(ctx, color, () => {
        ctx.moveTo(-halfW * 0.3, -halfH);
        ctx.lineTo(halfW * 0.3, -halfH);
        ctx.lineTo(halfW * 0.8, -halfH * 0.3);
        ctx.lineTo(halfW, halfH * 0.8);
        ctx.lineTo(halfW * 0.4, halfH * 0.5);
        ctx.lineTo(-halfW * 0.4, halfH * 0.5);
        ctx.lineTo(-halfW, halfH * 0.8);
        ctx.lineTo(-halfW * 0.8, -halfH * 0.3);
        ctx.closePath();
      });
      // Massive front shield bar
      drawGlowingPath(ctx, secondaryColor, () => {
        ctx.moveTo(-halfW * 0.6, -halfH * 0.5);
        ctx.lineTo(halfW * 0.6, -halfH * 0.5);
      });
      break;

    case 6: // Cyber Wraith - Diamond hull with energy lines
      drawGlowingPath(ctx, color, () => {
        ctx.moveTo(0, -halfH); // Top
        ctx.lineTo(halfW, 0); // Right
        ctx.lineTo(0, halfH); // Bottom
        ctx.lineTo(-halfW, 0); // Left
        ctx.closePath();
      });
      // Cyber criss-cross lines
      drawGlowingPath(ctx, secondaryColor, () => {
        ctx.moveTo(-halfW * 0.5, -halfH * 0.5);
        ctx.lineTo(halfW * 0.5, halfH * 0.5);
        ctx.moveTo(halfW * 0.5, -halfH * 0.5);
        ctx.lineTo(-halfW * 0.5, halfH * 0.5);
      }, 5);
      break;

    case 7: // Zenith Specter - Twin wing fighter
      drawGlowingPath(ctx, color, () => {
        // Left pod
        ctx.moveTo(-halfW * 0.7, -halfH * 0.5);
        ctx.lineTo(-halfW * 0.3, -halfH * 0.8);
        ctx.lineTo(-halfW * 0.3, halfH * 0.5);
        ctx.lineTo(-halfW * 0.7, halfH * 0.8);
        ctx.closePath();
      });
      drawGlowingPath(ctx, color, () => {
        // Right pod
        ctx.moveTo(halfW * 0.7, -halfH * 0.5);
        ctx.lineTo(halfW * 0.3, -halfH * 0.8);
        ctx.lineTo(halfW * 0.3, halfH * 0.5);
        ctx.lineTo(halfW * 0.7, halfH * 0.8);
        ctx.closePath();
      });
      // Central cockpit linked with energy arcs
      drawGlowingPath(ctx, secondaryColor, () => {
        ctx.moveTo(-halfW * 0.3, 0);
        ctx.quadraticCurveTo(0, -halfH, halfW * 0.3, 0);
        ctx.quadraticCurveTo(0, halfH, -halfW * 0.3, 0);
      });
      break;

    case 8: // Void Reaver - Asymmetrical Alien Tech
      drawGlowingPath(ctx, color, () => {
        ctx.moveTo(0, -halfH);
        ctx.lineTo(halfW * 0.2, -halfH * 0.4);
        ctx.lineTo(halfW * 0.9, halfH * 0.3); // Long right blade
        ctx.lineTo(halfW * 0.4, halfH * 0.5);
        ctx.lineTo(-halfW * 0.3, halfH * 0.8); // Angled back-left wing
        ctx.lineTo(-halfW * 0.8, -halfH * 0.1); // Short left hook
        ctx.closePath();
      });
      // Floating glowing void core
      ctx.save();
      ctx.fillStyle = secondaryColor;
      ctx.shadowColor = secondaryColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(-3, -5, 4 + Math.sin(time * 0.005) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;

    case 9: // Chronos Raider - Rotating energy arches
      // Dual golden rings around center
      ctx.save();
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Outer glowing ellipse, rotates with time
      ctx.ellipse(0, 0, halfW, halfH * 0.6, time * 0.0015, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      drawGlowingPath(ctx, secondaryColor, () => {
        // Chronos core needle/dagger
        ctx.moveTo(0, -halfH);
        ctx.lineTo(halfW * 0.3, 0);
        ctx.lineTo(0, halfH * 0.6);
        ctx.lineTo(-halfW * 0.3, 0);
        ctx.closePath();
      });
      break;

    case 10: // Aegis Sentinel - Hexagonal cockpit
      drawGlowingPath(ctx, color, () => {
        // Hexagon chassis
        ctx.moveTo(0, -halfH);
        ctx.lineTo(halfW * 0.8, -halfH * 0.4);
        ctx.lineTo(halfW * 0.8, halfH * 0.4);
        ctx.lineTo(0, halfH);
        ctx.lineTo(-halfW * 0.8, halfH * 0.4);
        ctx.lineTo(-halfW * 0.8, -halfH * 0.4);
        ctx.closePath();
      });
      // Orbiting plasma shield beads
      ctx.save();
      const numBeads = 3;
      ctx.fillStyle = secondaryColor;
      ctx.shadowColor = secondaryColor;
      ctx.shadowBlur = 8;
      for (let i = 0; i < numBeads; i++) {
        const angle = time * 0.002 + (i * Math.PI * 2) / numBeads;
        const bx = Math.cos(angle) * (halfW * 1.2);
        const by = Math.sin(angle) * (halfH * 1.2);
        ctx.beginPath();
        ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
  }

  ctx.restore();
}
