export interface Ship {
  id: string;
  name: string;
  description: string;
  color: string;
  secondaryColor: string;
  statSpeed: number; // Max speed multiplier
  statThrust: number; // Acceleration multiplier
  statHandling: number; // Left/Right speed
  specialAbility?: string;
  designId: number; // Matches procedural drawing logic
}

export type ObstacleType = 'meteor' | 'comet' | 'plasma_orb' | 'laser_drone' | 'void_crystal' | 'mega_asteroid' | 'airplane' | 'balloon' | 'satellite';

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: ObstacleType;
  color: string;
  angle: number;
  rotationSpeed: number;
  behavior: 'straight' | 'sine' | 'diagonal' | 'waving';
  initialX: number;
  waveAmplitude: number;
  waveFrequency: number;
  timeAlive: number;
  pulseSpeed: number;
  nearMissed?: boolean; // Has this obstacle triggered a near-miss point?
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
  type: 'engine' | 'explosion' | 'star' | 'near-miss';
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
  vy: number;
}

export interface GameStats {
  score: number;
  timeSurvived: number; // in seconds
  nearMisses: number;
}

export interface HighscoreRecord {
  score: number;
  date: string;
  shipId: string;
  timeSurvived: number;
}
