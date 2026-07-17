import React, { useEffect, useRef, useState } from 'react';
import { Ship, HighscoreRecord } from '../types';
import { SHIPS, drawShip } from '../ships';
import { Play, Rocket, Trophy, ChevronLeft, ChevronRight, Shield, Activity, Clock, Trash2, HelpCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DailyMission } from '../lib/missions';
import MissionsList from './MissionsList';

// Live animated canvas preview for each ship
export function ShipPreview({
  designId,
  color,
  secondaryColor,
  size = 80,
  borderless = false,
}: {
  designId: number;
  color: string;
  secondaryColor: string;
  size?: number;
  borderless?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw ship in the center
      drawShip(
        ctx,
        designId,
        size / 2,
        size / 2 + 2, // slightly lower to account for float offsets
        size * 0.55,
        size * 0.55,
        color,
        secondaryColor,
        true, // engineLeft
        true, // engineRight
        time * 0.1, // speed multiplier for math.sin
        0 // angle
      );
      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [designId, color, secondaryColor, size]);

  if (borderless) {
    return (
      <div className="flex items-center justify-center pointer-events-none select-none">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="block"
          style={{ width: `${size}px`, height: `${size}px` }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-2 rounded-xl bg-black/30 border border-white/5 shadow-[inset_0_0_12px_rgba(255,255,255,0.03)]">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="block"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
}

import { 
  SHIP_DESIGNS, 
  COLOR_COMBINATIONS, 
  EXHAUST_STYLES,
  ShipDesign,
  ColorCombination,
  ExhaustStyle 
} from '../lib/customization';

interface MainMenuProps {
  selectedDesignId: number;
  onSelectDesignId: (id: number) => void;
  selectedColorId: string;
  onSelectColorId: (id: string) => void;
  selectedExhaustId: 'plasma' | 'nova' | 'sparks' | 'nebula' | 'lightning';
  onSelectExhaustId: (id: 'plasma' | 'nova' | 'sparks' | 'nebula' | 'lightning') => void;
  onPlay: () => void;
  energizerBalance: number;
  dailyMissions: DailyMission[];
}

export default function MainMenu({ 
  selectedDesignId, 
  onSelectDesignId, 
  selectedColorId, 
  onSelectColorId, 
  selectedExhaustId, 
  onSelectExhaustId, 
  onPlay, 
  energizerBalance, 
  dailyMissions 
}: MainMenuProps) {
  const [activeTab, setActiveTab] = useState<'main' | 'ships' | 'highscores'>('main');
  const [customTab, setCustomTab] = useState<'design' | 'color' | 'exhaust'>('design');
  const [highscores, setHighscores] = useState<HighscoreRecord[]>([]);

  // Find active configurations
  const activeDesign = SHIP_DESIGNS.find((d) => d.id === selectedDesignId) || SHIP_DESIGNS[0];
  const activeColorCombo = COLOR_COMBINATIONS.find((c) => c.id === selectedColorId) || COLOR_COMBINATIONS[0];
  const activeExhaust = EXHAUST_STYLES.find((e) => e.id === selectedExhaustId) || EXHAUST_STYLES[0];

  // Load Highscores
  const loadHighscores = () => {
    try {
      const stored = localStorage.getItem('endless_runner_highscores');
      if (stored) {
        setHighscores(JSON.parse(stored));
      } else {
        setHighscores([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadHighscores();
  }, [activeTab]);

  const handleClearHighscores = () => {
    if (confirm('Möchtest du wirklich alle Highscores unwiderruflich löschen?')) {
      localStorage.removeItem('endless_runner_highscores');
      setHighscores([]);
    }
  };

  const nextDesign = () => {
    const currentIndex = SHIP_DESIGNS.findIndex((d) => d.id === selectedDesignId);
    const nextIdx = (currentIndex + 1) % SHIP_DESIGNS.length;
    onSelectDesignId(SHIP_DESIGNS[nextIdx].id);
  };

  const prevDesign = () => {
    const currentIndex = SHIP_DESIGNS.findIndex((d) => d.id === selectedDesignId);
    const prevIdx = (currentIndex - 1 + SHIP_DESIGNS.length) % SHIP_DESIGNS.length;
    onSelectDesignId(SHIP_DESIGNS[prevIdx].id);
  };

  const getRecordShipName = (record: HighscoreRecord) => {
    // Legacy support
    const legacyShip = SHIPS.find(s => s.id === record.shipId);
    if (legacyShip) return legacyShip.name;

    // Check if shipId is like 'ship_3'
    if (record.shipId && record.shipId.startsWith('ship_')) {
      const idNum = parseInt(record.shipId.replace('ship_', ''), 10);
      const design = SHIP_DESIGNS.find(d => d.id === idNum);
      if (design) return design.name;
    }

    return 'Spacecraft';
  };

  return (
    <div id="main_menu_panel" className="absolute inset-0 flex items-center justify-center p-4 md:p-8 z-10 select-none overflow-y-auto">
      {/* Energizer Balance */}
      <div id="menu_energizer_balance_top_right" className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center space-x-1 px-3 py-1.5 bg-black/45 backdrop-blur-md rounded-full border border-white/10 text-amber-400 font-orbitron font-bold text-xs select-none z-20 shadow-[0_0_15px_rgba(245,158,11,0.12)]">
        <Zap className="w-3.5 h-3.5 fill-current text-amber-400 mr-0.5 animate-pulse" />
        <span>{energizerBalance}</span>
      </div>

      <div className="w-full max-w-xl flex flex-col items-center">
        
        {/* Game Title Logo Area */}
        <div className="text-center mb-6 animate-float">
          <h1 id="menu_title_main" className="text-4xl md:text-5xl font-extrabold tracking-[0.25em] font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-[#00ffcc] via-[#ffffff] to-[#ff007f] drop-shadow-[0_0_30px_rgba(0,255,204,0.35)] uppercase select-none">
            NEON FLIGHT
          </h1>
          <p id="menu_subtitle" className="text-[10px] md:text-xs tracking-[0.4em] text-white/50 font-orbitron font-semibold uppercase mt-2">
            Endless Sci-Fi Orbit Arcade
          </p>
        </div>

        {/* Dynamic Inner Screens */}
        <AnimatePresence mode="wait">
          {activeTab === 'main' && (
            <motion.div
              key="main-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full glassmorphism rounded-2xl p-6 md:p-8 flex flex-col space-y-4 shadow-[0_0_40px_rgba(0,255,204,0.08)] neon-border"
            >
              {/* Floating spaceship preview with currently selected customization */}
              <div id="selected_ship_preview_floating" className="flex flex-col items-center justify-center py-4 select-none pointer-events-none">
                <div className="relative animate-float">
                  <div 
                    className="absolute inset-4 rounded-full blur-2xl opacity-25 scale-125 transition-all duration-500"
                    style={{ backgroundColor: activeColorCombo.primary }}
                  />
                  <ShipPreview 
                    designId={selectedDesignId} 
                    color={activeColorCombo.primary} 
                    secondaryColor={activeColorCombo.secondary} 
                    size={110} 
                    borderless={true}
                  />
                </div>
              </div>

              {/* Navigation Menu Buttons */}
              <button
                id="btn_play"
                onClick={onPlay}
                className="w-full py-4 rounded-xl font-orbitron font-bold text-lg tracking-wider text-black bg-[#00ffcc] hover:bg-[#33ffdd] active:scale-98 transition-all duration-200 shadow-[0_0_20px_rgba(0,255,204,0.35)] flex items-center justify-center space-x-2 border-b-4 border-emerald-500 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>SPIELEN</span>
              </button>

              <button
                id="btn_select_ship_tab"
                onClick={() => setActiveTab('ships')}
                className="w-full py-3.5 rounded-xl font-orbitron font-semibold text-sm tracking-widest text-white bg-white/5 hover:bg-white/10 active:scale-98 transition-all duration-200 border border-white/10 flex items-center justify-center space-x-2 cursor-pointer hover:border-[#00ffcc]/30"
              >
                <Rocket className="w-4 h-4 text-[#00ffcc]" />
                <span>HANGAR & TUNING</span>
              </button>

              <button
                id="btn_highscore_tab"
                onClick={() => setActiveTab('highscores')}
                className="w-full py-3.5 rounded-xl font-orbitron font-semibold text-sm tracking-widest text-white bg-white/5 hover:bg-white/10 active:scale-98 transition-all duration-200 border border-white/10 flex items-center justify-center space-x-2 cursor-pointer hover:border-[#ff007f]/30"
              >
                <Trophy className="w-4 h-4 text-[#ff007f]" />
                <span>LEADERBOARD</span>
              </button>

              {/* Daily Missions */}
              <MissionsList missions={dailyMissions} />

              {/* Basic controls hint */}
              <div id="controls_hint_box" className="pt-2 text-center text-[10px] md:text-xs text-white/40 border-t border-white/5">
                <p className="font-mono text-center flex items-center justify-center space-x-1">
                  <HelpCircle className="w-3.5 h-3.5 inline mr-1 text-white/50" />
                  <span>PC: Pfeiltasten links/rechts &bull; Mobile: Bildschirmhälften berühren</span>
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'ships' && (
            <motion.div
              key="ships-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full glassmorphism rounded-2xl p-5 flex flex-col shadow-[0_0_40px_rgba(0,255,204,0.08)] neon-border"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                <h2 id="ship_selector_header" className="font-orbitron font-bold text-base tracking-widest text-[#00ffcc]">HANGAR & TUNING</h2>
                <div className="flex space-x-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                  <button 
                    onClick={() => setCustomTab('design')} 
                    className={`px-2.5 py-1 text-[10px] font-orbitron font-bold rounded-md transition-all ${customTab === 'design' ? 'bg-[#00ffcc] text-black shadow-[0_0_10px_rgba(0,255,204,0.3)]' : 'text-white/60 hover:text-white'}`}
                  >
                    RUMPF
                  </button>
                  <button 
                    onClick={() => setCustomTab('color')} 
                    className={`px-2.5 py-1 text-[10px] font-orbitron font-bold rounded-md transition-all ${customTab === 'color' ? 'bg-[#00ffcc] text-black shadow-[0_0_10px_rgba(0,255,204,0.3)]' : 'text-white/60 hover:text-white'}`}
                  >
                    FARBE
                  </button>
                  <button 
                    onClick={() => setCustomTab('exhaust')} 
                    className={`px-2.5 py-1 text-[10px] font-orbitron font-bold rounded-md transition-all ${customTab === 'exhaust' ? 'bg-[#00ffcc] text-black shadow-[0_0_10px_rgba(0,255,204,0.3)]' : 'text-white/60 hover:text-white'}`}
                  >
                    ABGAS
                  </button>
                </div>
              </div>

              {/* Top half: Live Dynamic Custom Preview */}
              <div id="ship_custom_preview" className="flex flex-col items-center select-none py-2 relative">
                <div className="absolute right-2 top-2 px-2 py-0.5 rounded bg-white/5 border border-white/5 font-mono text-[9px] text-white/40 tracking-wider">
                  {activeExhaust.name}
                </div>
                <ShipPreview 
                  designId={selectedDesignId} 
                  color={activeColorCombo.primary} 
                  secondaryColor={activeColorCombo.secondary} 
                  size={95} 
                />
              </div>

              {/* Lower half options based on customTab */}
              <div className="min-h-[190px] flex flex-col justify-between py-2 border-t border-white/5">
                <AnimatePresence mode="wait">
                  {customTab === 'design' && (
                    <motion.div
                      key="tab-design"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      {/* Carousel Selector */}
                      <div className="flex items-center justify-between">
                        <button
                          id="btn_carousel_prev"
                          onClick={prevDesign}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-[#00ffcc]/20 border border-white/10 hover:border-[#00ffcc]/30 text-white transition-all cursor-pointer"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="text-center flex-1">
                          <h3 id="display_ship_name" className="font-orbitron font-black text-base text-white tracking-wider" style={{ color: activeColorCombo.primary }}>
                            {activeDesign.name}
                          </h3>
                          <span className="text-[9px] text-white/40 font-mono tracking-widest uppercase">Modell {selectedDesignId} / 10</span>
                        </div>
                        <button
                          id="btn_carousel_next"
                          onClick={nextDesign}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-[#00ffcc]/20 border border-white/10 hover:border-[#00ffcc]/30 text-white transition-all cursor-pointer"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Ability Badge */}
                      <div className="text-center text-xs px-2 text-white/70">
                        {activeDesign.description}
                        <div className="mt-1 flex items-center justify-center space-x-1.5 text-[10px] font-orbitron tracking-widest text-[#00ffcc] uppercase">
                          <Shield className="w-3.5 h-3.5" />
                          <span>{activeDesign.specialAbility}</span>
                        </div>
                      </div>

                      {/* Stats Section */}
                      <div id="ship_stats_container" className="grid grid-cols-3 gap-2.5 pt-1.5">
                        <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">
                          <div className="text-[8px] text-white/40 font-mono tracking-wider mb-0.5">GESCHW.</div>
                          <div className="text-xs font-orbitron font-bold text-white">{activeDesign.statSpeed} / 10</div>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">
                          <div className="text-[8px] text-white/40 font-mono tracking-wider mb-0.5">SCHUB</div>
                          <div className="text-xs font-orbitron font-bold text-white">{activeDesign.statThrust} / 10</div>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">
                          <div className="text-[8px] text-white/40 font-mono tracking-wider mb-0.5">WENDIGKEIT</div>
                          <div className="text-xs font-orbitron font-bold text-[#00ffcc]">{activeDesign.statHandling} / 10</div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {customTab === 'color' && (
                    <motion.div
                      key="tab-color"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      <div className="text-center">
                        <h4 className="font-orbitron font-bold text-xs text-white/70 uppercase tracking-widest">Farbkombinationen</h4>
                        <p className="text-[9px] text-white/40 font-mono tracking-wider mt-0.5">Wähle das Farbschema für Hülle und Triebwerksleuchten</p>
                      </div>

                      <div className="grid grid-cols-5 gap-2 max-h-[110px] overflow-y-auto p-1">
                        {COLOR_COMBINATIONS.map((combo) => {
                          const isActive = combo.id === selectedColorId;
                          return (
                            <button
                              key={combo.id}
                              onClick={() => onSelectColorId(combo.id)}
                              className={`aspect-square rounded-xl p-1.5 flex flex-col items-center justify-center border transition-all relative cursor-pointer ${
                                isActive 
                                  ? 'bg-[#00ffcc]/10 border-[#00ffcc] shadow-[0_0_10px_rgba(0,255,204,0.25)] scale-105' 
                                  : 'bg-white/5 border-white/5 hover:border-white/20 hover:scale-102'
                              }`}
                              title={combo.name}
                            >
                              <div className="flex -space-x-1 mb-1">
                                <div className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-md" style={{ backgroundColor: combo.primary }} />
                                <div className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-md" style={{ backgroundColor: combo.secondary }} />
                              </div>
                              <span className="text-[7px] text-white/60 font-orbitron text-center leading-none truncate max-w-full">
                                {combo.name.split(' ')[0]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {customTab === 'exhaust' && (
                    <motion.div
                      key="tab-exhaust"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-2"
                    >
                      <div className="text-center">
                        <h4 className="font-orbitron font-bold text-xs text-white/70 uppercase tracking-widest">Triebwerks-Emissionen</h4>
                        <p className="text-[9px] text-white/40 font-mono tracking-wider mt-0.5">Wähle den Abgas-Typ und Flammen-Fluss deines Schiffs</p>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                        {EXHAUST_STYLES.map((style) => {
                          const isActive = style.id === selectedExhaustId;
                          return (
                            <button
                              key={style.id}
                              onClick={() => onSelectExhaustId(style.id)}
                              className={`p-2 rounded-lg border text-left flex flex-col transition-all cursor-pointer ${
                                isActive 
                                  ? 'bg-[#00ffcc]/10 border-[#00ffcc] shadow-[0_0_8px_rgba(0,255,204,0.15)]' 
                                  : 'bg-white/5 border-white/5 hover:border-white/10'
                              }`}
                            >
                              <span className="text-xs font-orbitron font-bold tracking-wider text-white flex items-center justify-between">
                                <span>{style.name}</span>
                                {isActive && <span className="text-[8px] px-1.5 py-0.2 bg-[#00ffcc] text-black font-extrabold rounded-sm">AKTIV</span>}
                              </span>
                              <span className="text-[9px] text-white/55 leading-tight mt-0.5">{style.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Confirm and Back Panel */}
                <div className="flex space-x-3 pt-3 border-t border-white/5">
                  <button
                    id="btn_confirm_ship"
                    onClick={() => {
                      setActiveTab('main');
                    }}
                    className="w-full py-2.5 rounded-lg font-orbitron font-bold text-xs tracking-widest text-black bg-[#00ffcc] hover:bg-[#33ffdd] shadow-[0_0_15px_rgba(0,255,204,0.25)] cursor-pointer text-center uppercase"
                  >
                    Tuning abschließen
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'highscores' && (
            <motion.div
              key="highscores-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full glassmorphism rounded-2xl p-6 flex flex-col shadow-[0_0_40px_rgba(255,0,127,0.08)] border-[#ff007f]/30"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                <h2 id="highscores_header" className="font-orbitron font-bold text-lg tracking-widest text-[#ff007f] flex items-center space-x-2">
                  <Trophy className="w-5 h-5 mr-1" />
                  <span>LEADERBOARD</span>
                </h2>
                {highscores.length > 0 && (
                  <button
                    id="btn_clear_scores"
                    onClick={handleClearHighscores}
                    className="p-1 rounded text-white/40 hover:text-red-500 hover:bg-white/5 transition-all cursor-pointer"
                    title="Highscores löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Highscore Table List Frame */}
              <div id="highscore_table_frame" className="max-h-[250px] overflow-y-auto space-y-2.5 pr-1 mb-4">
                {highscores.length === 0 ? (
                  <div className="text-center py-10 text-white/40 font-mono text-sm">
                    Keine Einträge vorhanden. Fliege deine erste Mission, um Punkte zu sammeln!
                  </div>
                ) : (
                  highscores.map((record, index) => {
                    const shipName = getRecordShipName(record);
                    const isFirst = index === 0;
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${
                          isFirst
                            ? 'bg-gradient-to-r from-[#ff007f]/10 to-[#00ffcc]/5 border-[#ff007f]/40 shadow-[0_0_12px_rgba(255,0,127,0.15)]'
                            : 'bg-white/5 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {/* Rank Badge */}
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-orbitron font-bold text-xs ${
                              isFirst
                                ? 'bg-[#ff007f] text-white shadow-[0_0_10px_rgba(255,0,127,0.4)]'
                                : index === 1
                                ? 'bg-amber-500 text-black'
                                : index === 2
                                ? 'bg-slate-400 text-black'
                                : 'bg-white/10 text-white/70'
                            }`}
                          >
                            {index + 1}
                          </div>
                          
                          {/* Ship Profile */}
                          <div>
                            <div className="font-orbitron font-bold text-white tracking-wide">{shipName}</div>
                            <div className="flex items-center space-x-2 text-[10px] text-white/50 font-mono mt-0.5">
                              <span className="flex items-center"><Clock className="w-3 h-3 mr-0.5" /> {record.timeSurvived}s</span>
                              <span>&bull;</span>
                              <span>{record.date}</span>
                            </div>
                          </div>
                        </div>

                        {/* Points score */}
                        <div className="text-right">
                          <div className={`font-orbitron font-extrabold text-base tracking-wider ${isFirst ? 'text-[#ff007f] drop-shadow-[0_0_6px_rgba(255,0,127,0.3)]' : 'text-white'}`}>
                            {record.score.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-white/30 font-mono uppercase tracking-widest">PUNKTE</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <button
                id="btn_back_to_main_from_scores"
                onClick={() => setActiveTab('main')}
                className="w-full py-3 rounded-lg font-orbitron font-semibold text-xs tracking-widest text-white bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
              >
                ZURÜCK ZUM HAUPTMENÜ
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
      </div>
    </div>
  );
}
