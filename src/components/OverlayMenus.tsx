import React, { useEffect, useState, useRef } from 'react';
import { GameStats } from '../types';
import { SHIPS, drawShip } from '../ships';
import { Play, RotateCcw, Home, Trophy, Clock, AlertTriangle, Crosshair, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { DailyMission } from '../lib/missions';
import MissionsList from './MissionsList';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  dailyMissions: DailyMission[];
}

export function PauseMenu({ onResume, onRestart, onMainMenu, dailyMissions }: PauseMenuProps) {
  return (
    <div id="pause_overlay" className="absolute inset-0 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 z-20">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-sm glassmorphism rounded-2xl p-6 md:p-8 flex flex-col text-center space-y-5 border-[#ffcc00]/30 shadow-[0_0_35px_rgba(255,204,0,0.1)]"
      >
        <div>
          <h2 id="pause_header" className="font-orbitron font-black text-3xl text-[#ffcc00] tracking-[0.2em] uppercase drop-shadow-[0_0_15px_rgba(255,204,0,0.35)]">
            PAUSE
          </h2>
          <p id="pause_subheader" className="text-[10px] tracking-widest text-white/50 font-orbitron uppercase mt-1">
            Systeme im Standby
          </p>
        </div>

        {/* Daily Missions */}
        <MissionsList missions={dailyMissions} compact={true} />

        {/* Buttons List */}
        <div className="flex flex-col space-y-3 pt-2">
          <button
            id="btn_pause_resume"
            onClick={onResume}
            className="w-full py-3.5 rounded-xl font-orbitron font-bold text-sm tracking-widest text-black bg-[#ffcc00] hover:bg-[#ffdd33] transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer shadow-[0_0_15px_rgba(255,204,0,0.25)]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>FORTSETZEN</span>
          </button>

          <button
            id="btn_pause_restart"
            onClick={onRestart}
            className="w-full py-3.5 rounded-xl font-orbitron font-semibold text-sm tracking-widest text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#ffcc00]/30 transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>NEUSTART</span>
          </button>

          <button
            id="btn_pause_main_menu"
            onClick={onMainMenu}
            className="w-full py-3.5 rounded-xl font-orbitron font-semibold text-sm tracking-widest text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>HAUPTMENÜ</span>
          </button>
        </div>

        {/* Navigation advice */}
        <div className="text-[10px] text-white/40 font-mono border-t border-white/5 pt-3">
          Verwende Pfeiltasten oder tippe auf den Bildschirm, um nach der Pause sofort auszuweichen.
        </div>
      </motion.div>
    </div>
  );
}

interface GameOverMenuProps {
  stats: GameStats;
  designId: number;
  color: string;
  secondaryColor: string;
  onRestart: () => void;
  onMainMenu: () => void;
  onRevive: () => void;
  energizerBalance: number;
  reviveCost: number;
}

export function GameOverMenu({
  stats,
  designId,
  color,
  secondaryColor,
  onRestart,
  onMainMenu,
  onRevive,
  energizerBalance,
  reviveCost,
}: GameOverMenuProps) {
  const [isNewHighscore, setIsNewHighscore] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('endless_runner_highscores');
      if (stored) {
        const records = JSON.parse(stored);
        if (records.length > 0 && records[0].score === stats.score && stats.score > 0) {
          setIsNewHighscore(true);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [stats.score]);

  return (
    <div id="gameover_overlay" className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 z-25 overflow-y-auto select-none">
      {/* Energizer Balance */}
      <div id="gameover_energizer_balance_top_right" className="absolute top-6 right-6 flex items-center space-x-1.5 px-3 py-1.5 bg-black/60 rounded-full border border-white/10 text-amber-400 font-orbitron font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.12)]">
        <Zap className="w-3.5 h-3.5 fill-current animate-pulse text-amber-400" />
        <span>{energizerBalance}</span>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm bg-[#050814]/90 border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col space-y-6 shadow-[0_0_40px_rgba(0,0,0,0.8)] my-auto text-center"
      >
        <div>
          <h2 id="gameover_header" className="font-orbitron font-black text-xl text-white/90 tracking-[0.2em] uppercase">
            FLUG BEENDET
          </h2>
          <p id="gameover_subheader" className="text-[10px] tracking-widest text-white/45 font-mono uppercase mt-1">
            Kollision mit Trümmerteil registriert
          </p>
        </div>

        {/* Minimalist Score & stats list */}
        <div className="flex flex-col space-y-4">
          <div className="relative py-4 border-y border-white/5 flex flex-col items-center justify-center">
            {isNewHighscore && (
              <div className="absolute -top-3 px-3 py-0.5 bg-[#00ffcc] text-black text-[9px] font-orbitron font-black rounded-full tracking-wider shadow-[0_0_10px_rgba(0,255,204,0.3)] uppercase">
                NEUER REKORD!
              </div>
            )}
            <span className="text-[10px] font-orbitron text-white/40 tracking-widest uppercase mb-1">Punkte</span>
            <span id="final_score" className="font-orbitron font-black text-4xl text-white tracking-widest">
              {stats.score.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center py-2">
            <div>
              <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider mb-0.5">Flugzeit</div>
              <div id="stat_time" className="font-orbitron font-bold text-sm text-white/85">{stats.timeSurvived}s</div>
            </div>
            <div>
              <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider mb-0.5">Near Miss</div>
              <div id="stat_nearmiss" className="font-orbitron font-bold text-sm text-[#00ffcc]">{stats.nearMisses}</div>
            </div>
            <div>
              <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider mb-0.5">Energizer</div>
              <div id="stat_energizer" className="font-orbitron font-bold text-sm text-amber-400">+{Math.floor(stats.score / 10)}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3 pt-2">
          <button
            id="btn_gameover_revive"
            onClick={onRevive}
            disabled={energizerBalance < reviveCost}
            className={`w-full py-3.5 rounded-xl font-orbitron font-bold text-xs tracking-wider flex items-center justify-center space-x-2 transition-all duration-150 cursor-pointer ${
              energizerBalance >= reviveCost
                ? 'text-black bg-[#00ffcc] hover:bg-[#33ffdd] shadow-[0_0_15px_rgba(0,255,204,0.25)] active:scale-98'
                : 'text-white/30 bg-white/5 border border-white/5 opacity-50 cursor-not-allowed'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${energizerBalance >= reviveCost ? 'fill-current text-black' : ''}`} />
            <span>WIEDERBELEBEN (-{reviveCost})</span>
          </button>

          <button
            id="btn_gameover_restart"
            onClick={onRestart}
            className="w-full py-3 rounded-xl font-orbitron font-semibold text-xs tracking-wider text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 active:scale-98 transition-all duration-150 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ERNEUT STARTEN</span>
          </button>

          <button
            id="btn_gameover_menu"
            onClick={onMainMenu}
            className="w-full py-2.5 rounded-xl font-orbitron font-medium text-xs tracking-wider text-white/50 hover:text-white bg-transparent hover:bg-white/5 active:scale-98 transition-all duration-150 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>ZURÜCK ZUM MENÜ</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface ShipViewerProps {
  designId: number;
  color: string;
  secondaryColor: string;
}

export function ShipViewer({ designId, color, secondaryColor }: ShipViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    let time = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      drawShip(
        ctx,
        designId,
        120, // Center CSS X (canvas is styled 240px wide)
        120, // Center CSS Y
        120, // larger width
        120, // larger height
        color,
        secondaryColor,
        true,
        true,
        time,
        time * 0.0015
      );

      ctx.restore();
      time += 16.666;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [designId, color, secondaryColor]);

  return (
    <div className="relative flex items-center justify-center my-4">
      <div 
        style={{ 
          background: `radial-gradient(circle, ${color}35 0%, transparent 70%)`,
          boxShadow: `0 0 50px 15px ${color}10`
        }} 
        className="absolute w-48 h-48 rounded-full animate-pulse filter blur-xl" 
        id="ship_viewer_glow"
      />
      
      <canvas
        ref={canvasRef}
        width={240 * (window.devicePixelRatio || 1)}
        height={240 * (window.devicePixelRatio || 1)}
        style={{ width: '240px', height: '240px' }}
        className="relative drop-shadow-[0_0_35px_rgba(255,255,255,0.25)] z-10"
        id="ship_viewer_canvas"
      />
    </div>
  );
}

interface HighscoreCelebrationMenuProps {
  score: number;
  designId: number;
  color: string;
  secondaryColor: string;
  onRestart: () => void;
  onMainMenu: () => void;
  onRevive: () => void;
  energizerBalance: number;
  reviveCost: number;
}

export function HighscoreCelebrationMenu({
  score,
  designId,
  color,
  secondaryColor,
  onRestart,
  onMainMenu,
  onRevive,
  energizerBalance,
  reviveCost,
}: HighscoreCelebrationMenuProps) {
  return (
    <div id="highscore_celebration_overlay" className="absolute inset-0 bg-[#02050f]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 z-30 select-none overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,204,0.04)_0%,transparent_75%)] pointer-events-none" />

      {/* Energizer Balance */}
      <div id="highscore_energizer_balance_top_right" className="absolute top-6 right-6 flex items-center space-x-1.5 px-3 py-1.5 bg-black/60 rounded-full border border-white/10 text-amber-400 font-orbitron font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.12)]">
        <Zap className="w-3.5 h-3.5 fill-current animate-pulse text-amber-400" />
        <span>{energizerBalance}</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-sm flex flex-col items-center text-center space-y-5"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
          className="flex items-center space-x-2 px-4 py-1.5 bg-[#00ffcc]/10 border border-[#00ffcc]/30 rounded-full text-[#00ffcc] font-orbitron font-extrabold text-[10px] tracking-[0.25em] uppercase shadow-[0_0_20px_rgba(0,255,204,0.15)] animate-pulse"
        >
          <Trophy className="w-4 h-4 text-amber-400 fill-current" />
          <span>NEUER REKORD!</span>
        </motion.div>

        <div className="space-y-1">
          <motion.h1
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="font-orbitron font-black text-5xl md:text-6xl text-white tracking-widest drop-shadow-[0_0_25px_rgba(255,255,255,0.25)]"
          >
            {score.toLocaleString()}
          </motion.h1>
          <p className="text-[9px] tracking-[0.25em] text-white/40 font-orbitron uppercase">
            Punkte erreicht
          </p>
        </div>

        {/* Space Ship custom Render Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full flex justify-center"
        >
          <ShipViewer designId={designId} color={color} secondaryColor={secondaryColor} />
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col space-y-3 w-full max-w-xs pt-2"
        >
          <button
            id="btn_record_revive"
            onClick={onRevive}
            disabled={energizerBalance < reviveCost}
            className={`w-full py-3.5 rounded-xl font-orbitron font-bold text-xs tracking-wider flex items-center justify-center space-x-2 transition-all duration-150 cursor-pointer ${
              energizerBalance >= reviveCost
                ? 'text-black bg-[#00ffcc] hover:bg-[#33ffdd] shadow-[0_0_15px_rgba(0,255,204,0.25)] active:scale-98'
                : 'text-white/30 bg-white/5 border border-white/5 opacity-50 cursor-not-allowed'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${energizerBalance >= reviveCost ? 'fill-current text-black' : ''}`} />
            <span>WIEDERBELEBEN (-{reviveCost})</span>
          </button>

          <button
            id="btn_record_restart"
            onClick={onRestart}
            className="w-full py-3 rounded-xl font-orbitron font-semibold text-xs tracking-wider text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 active:scale-98 transition-all duration-150 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ERNEUT STARTEN</span>
          </button>

          <button
            id="btn_record_menu"
            onClick={onMainMenu}
            className="w-full py-2.5 rounded-xl font-orbitron font-medium text-xs tracking-wider text-white/50 hover:text-white bg-transparent hover:bg-white/5 active:scale-98 transition-all duration-150 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>ZURÜCK ZUM MENÜ</span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
