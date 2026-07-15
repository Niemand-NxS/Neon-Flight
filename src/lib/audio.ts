class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private playInterval: any = null;
  private lastThrustTime: number = 0;

  constructor() {
    // Lazy load on first user click to satisfy modern browser permission limits
  }

  private init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    this.ctx = new AudioContextClass();
    
    // Load mute preference
    const storedMute = localStorage.getItem('endless_runner_muted');
    if (storedMute === 'true') {
      this.isMuted = true;
    }
  }

  public toggleMute(): boolean {
    this.init();
    this.isMuted = !this.isMuted;
    localStorage.setItem('endless_runner_muted', String(this.isMuted));
    
    if (this.isMuted && this.ctx) {
      if (this.ctx.state !== 'closed') {
        this.ctx.suspend();
      }
    } else if (!this.isMuted && this.ctx) {
      this.ctx.resume();
      this.playBackgroundMusic();
    }
    return this.isMuted;
  }

  public getMutedState(): boolean {
    const storedMute = localStorage.getItem('endless_runner_muted');
    return storedMute === 'true' || this.isMuted;
  }

  public playBackgroundMusic() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    if (this.playInterval) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Modern high-tech 8-step minor cyberpunk synth sequence
    const notes = [110.0, 110.0, 130.81, 110.0, 146.83, 130.81, 164.81, 146.83]; // A2, A2, C3, A2, D3, C3, E3, D3
    const melodyNotes = [220.0, 261.63, 293.66, 329.63]; // High arpeggiator notes
    let step = 0;

    this.playInterval = setInterval(() => {
      if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;

      try {
        const time = this.ctx.currentTime;
        
        // 1. Bassline synth
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(notes[step % notes.length], time);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, time);

        bassGain.gain.setValueAtTime(0.045, time);
        bassGain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);

        bassOsc.connect(filter);
        filter.connect(bassGain);
        bassGain.connect(this.ctx.destination);

        bassOsc.start(time);
        bassOsc.stop(time + 0.4);

        // 2. High-Tech Arpeggio Melody overlay
        if (step % 2 === 0) {
          const melOsc = this.ctx.createOscillator();
          const melGain = this.ctx.createGain();
          melOsc.type = 'triangle';
          const randomMelodyNote = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];
          melOsc.frequency.setValueAtTime(randomMelodyNote, time);

          melGain.gain.setValueAtTime(0.015, time);
          melGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

          melOsc.connect(melGain);
          melGain.connect(this.ctx.destination);

          melOsc.start(time);
          melOsc.stop(time + 0.24);
        }

        // 3. Ambient cyber clap / high hat noise overlay (extremely soft)
        if (step % 4 === 2) {
          const noiseOsc = this.ctx.createOscillator();
          const noiseGain = this.ctx.createGain();
          noiseOsc.type = 'triangle'; // faux hat
          noiseOsc.frequency.setValueAtTime(4000, time);
          noiseGain.gain.setValueAtTime(0.006, time);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
          noiseOsc.connect(noiseGain);
          noiseGain.connect(this.ctx.destination);
          noiseOsc.start(time);
          noiseOsc.stop(time + 0.1);
        }

        step = (step + 1) % 16;

        // Occasionally trigger cosmic beep in the high registers
        if (Math.random() < 0.12) {
          this.playCosmicGlitch();
        }
      } catch (e) {
        console.warn('Synth error', e);
      }
    }, 280); // Speed up tempo slightly for more adrenaline!
  }

  public playCosmicGlitch() {
    if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;
    try {
      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400 + Math.random() * 800, time);
      gain.gain.setValueAtTime(0.01, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.18);
    } catch (e) {}
  }

  public playNearMiss() {
    this.init();
    if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;
    try {
      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, time);
      osc.frequency.exponentialRampToValueAtTime(1500, time + 0.15);

      gain.gain.setValueAtTime(0.05, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.18);
    } catch (e) {}
  }

  public playCrash() {
    this.init();
    if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;
    try {
      const time = this.ctx.currentTime;

      // Heavy explosion bass rumble
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.linearRampToValueAtTime(10, time + 0.7);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, time);

      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.75);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.8);
    } catch (e) {}
  }

  public playCountdownBeep(isGo: boolean) {
    this.init();
    if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;
    try {
      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, time);
      
      gain.gain.setValueAtTime(isGo ? 0.08 : 0.06, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + (isGo ? 0.35 : 0.18));
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(time);
      osc.stop(time + (isGo ? 0.4 : 0.2));
    } catch (e) {}
  }

  public playLevelUp() {
    this.init();
    if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;
    try {
      const time = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time + index * 0.08);
        gain.gain.setValueAtTime(0.04, time + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, time + index * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(time + index * 0.08);
        osc.stop(time + index * 0.08 + 0.3);
      });
    } catch (e) {}
  }

  public playThrust() {
    this.init();
    if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;
    const now = Date.now();
    if (now - this.lastThrustTime < 80) return; // rate limit thruster synth triggering
    this.lastThrustTime = now;
    try {
      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(70 + Math.random() * 20, time);
      osc.frequency.linearRampToValueAtTime(35, time + 0.12);
      
      gain.gain.setValueAtTime(0.035, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(time);
      osc.stop(time + 0.16);
    } catch (e) {}
  }

  public stopBackgroundMusic() {
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }
}

export const gameAudio = new AudioEngine();
