export interface ColorCombination {
  id: string;
  name: string;
  primary: string;
  secondary: string;
}

export interface ExhaustStyle {
  id: 'plasma' | 'nova' | 'sparks' | 'nebula' | 'lightning';
  name: string;
  description: string;
}

export interface ShipDesign {
  id: number;
  name: string;
  description: string;
  specialAbility: string;
  statSpeed: number;
  statThrust: number;
  statHandling: number;
}

export const SHIP_DESIGNS: ShipDesign[] = [
  {
    id: 1,
    name: 'Nebula Interceptor',
    description: 'Schnittiger Delta-Flügler für maximale Wendigkeit im dichten Trümmerfeld.',
    specialAbility: 'Wendig & Flexibel',
    statSpeed: 8,
    statThrust: 7,
    statHandling: 9,
  },
  {
    id: 2,
    name: 'Quantum Phoenix',
    description: 'Besitzt hocheffiziente Triebwerke für extremen Schub und rasante Beschleunigung.',
    specialAbility: 'Mega-Schubkraft',
    statSpeed: 9,
    statThrust: 10,
    statHandling: 6,
  },
  {
    id: 3,
    name: 'Solar Flare',
    description: 'Nutzt Solarkonverter für konstanten Auftrieb und gleitendes Ausweichen.',
    specialAbility: 'Solar-Schwebeschild',
    statSpeed: 7,
    statThrust: 8,
    statHandling: 8,
  },
  {
    id: 4,
    name: 'Vortex Shadow',
    description: 'Spionage-Gleiter mit geteilter Triebwerkssignatur für exzellente Stabilisierung.',
    specialAbility: 'Ultra-Präzise Drifts',
    statSpeed: 7,
    statThrust: 6,
    statHandling: 10,
  },
  {
    id: 5,
    name: 'Hyperion Vanguard',
    description: 'Schwerer Prototyp mit robusten Flankenspoilern und starker Gravitationsbremse.',
    specialAbility: 'Trägheitsdämpfer',
    statSpeed: 6,
    statThrust: 9,
    statHandling: 7,
  },
  {
    id: 6,
    name: 'Cyber Wraith',
    description: 'Agiler Diamant-Rumpf mit asymmetrischen Energieleitern für schnelle Drifts.',
    specialAbility: 'Hypersound-Gleiter',
    statSpeed: 10,
    statThrust: 7,
    statHandling: 7,
  },
  {
    id: 7,
    name: 'Zenith Specter',
    description: 'Ausgestattet mit synchronisierten Doppelflügeln für maximale Kontrolle.',
    specialAbility: 'Harmonische Dynamik',
    statSpeed: 8,
    statThrust: 8,
    statHandling: 8,
  },
  {
    id: 8,
    name: 'Void Reaver',
    description: 'Mysteriöse außerirdische Technologie mit schwebenden Kristall-Triebwerken.',
    specialAbility: 'Kollaps-Kern',
    statSpeed: 9,
    statThrust: 6,
    statHandling: 8,
  },
  {
    id: 9,
    name: 'Chronos Raider',
    description: 'Besitzt rotierende Energie-Bögen für ein stabileres Navigationsfeld.',
    specialAbility: 'Temporale Balance',
    statSpeed: 8,
    statThrust: 9,
    statHandling: 7,
  },
  {
    id: 10,
    name: 'Aegis Sentinel',
    description: 'Gepanzertes Hexagonal-Chassis mit umlaufendem Plasma-Schutzring.',
    specialAbility: 'Erhöhte Abprall-Kontrolle',
    statSpeed: 5,
    statThrust: 10,
    statHandling: 8,
  },
];

export const COLOR_COMBINATIONS: ColorCombination[] = [
  { id: 'cyan_purple', name: 'Neon-Cyan & Violett', primary: '#00ffcc', secondary: '#9900ff' },
  { id: 'orange_gold', name: 'Neon-Orange & Gold', primary: '#ff3300', secondary: '#ffaa00' },
  { id: 'gold_pink', name: 'Warm-Gold & Hot-Pink', primary: '#ffcc00', secondary: '#ff0055' },
  { id: 'green_cyan', name: 'Säure-Grün & Türkis', primary: '#39ff14', secondary: '#00ffff' },
  { id: 'blue_mint', name: 'Kobalt-Blau & Minze', primary: '#0066ff', secondary: '#00ffcc' },
  { id: 'pink_white', name: 'Cyber-Pink & Weiß', primary: '#ff007f', secondary: '#ffffff' },
  { id: 'violet_yellow', name: 'Ultraviolett & Gelb', primary: '#bd00ff', secondary: '#ffea00' },
  { id: 'emerald_indigo', name: 'Smaragd & Indigo', primary: '#13ffc0', secondary: '#5c00ff' },
  { id: 'lime_red', name: 'Gift-Grün & Lava-Rot', primary: '#e2f702', secondary: '#ff4b00' },
  { id: 'crimson_green', name: 'Scharlach & Frühling', primary: '#ff003c', secondary: '#00ff66' },
];

export const EXHAUST_STYLES: ExhaustStyle[] = [
  {
    id: 'plasma',
    name: 'Standard-Plasma',
    description: 'Ein klassischer, konzentrierter Triebwerksstrahl aus supererhitztem Plasma.',
  },
  {
    id: 'nova',
    name: 'Nova-Flamme',
    description: 'Eine wilde, energiereiche Entladung mit hoher thermischer Druckwelle.',
  },
  {
    id: 'sparks',
    name: 'Doppel-Funken',
    description: 'Hunderte winziger, hochenergetischer Funken, die extrem schnell nach hinten schießen.',
  },
  {
    id: 'nebula',
    name: 'Kosmischer Nebel',
    description: 'Hinterlässt weiche, expandierende Plasmawolken, die sanft im Vakuum driften.',
  },
  {
    id: 'lightning',
    name: 'Hyper-Blitze',
    description: 'Eine instabile, elektrische Entladung mit sichtbaren neon-cyanfarbenen Blitzen.',
  },
];
