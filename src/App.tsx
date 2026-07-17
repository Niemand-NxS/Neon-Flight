import React, { useState, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import { PauseMenu, GameOverMenu, HighscoreCelebrationMenu } from './components/OverlayMenus';
import { GameStats, HighscoreRecord } from './types';
import { gameAudio } from './lib/audio';
import { Pause, Volume2, VolumeX, Trophy, Shield, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { getOrCreateDailyMissions, processRunMissions, DailyMission } from './lib/missions';
import { COLOR_COMBINATIONS } from './lib/customization';

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [highscore, setHighscore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [finalStats, setFinalStats] = useState<GameStats | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Modular Customization States
  const [selectedDesignId, setSelectedDesignId] = useState<number>(() => {
    const stored = localStorage.getItem('endless_runner_selected_design_id');
    return stored !== null ? parseInt(stored, 10) : 1;
  });
  const [selectedColorId, setSelectedColorId] = useState<string>(() => {
    const stored = localStorage.getItem('endless_runner_selected_color_id');
    return stored !== null ? stored : 'cyber_mint';
  });
  const [selectedExhaustId, setSelectedExhaustId] = useState<'plasma' | 'nova' | 'sparks' | 'nebula' | 'lightning'>(() => {
    const stored = localStorage.getItem('endless_runner_selected_exhaust_id');
    return (stored !== null ? stored : 'plasma') as any;
  });

  // Energizer currency and Revive system states
  const [energizerBalance, setEnergizerBalance] = useState<number>(() => {
    const stored = localStorage.getItem('endless_runner_energizer_balance');
    return stored !== null ? parseInt(stored, 10) : 100;
  });
  const [resetOnStart, setResetOnStart] = useState(true);
  const [reviveTrigger, setReviveTrigger] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [reviveCount, setReviveCount] = useState<number>(0);
  const [recordAtStart, setRecordAtStart] = useState<number>(0);
  const [scorePopups, setScorePopups] = useState<{ id: number; text: string }[]>([]);

  const [dailyMissions, setDailyMissions] = useState<DailyMission[]>(() => {
    return getOrCreateDailyMissions();
  });

  // Initialize and load top highscore on mount
  useEffect(() => {
    try {
      const storedScores = localStorage.getItem('endless_runner_highscores');
      if (storedScores) {
        const records: HighscoreRecord[] = JSON.parse(storedScores);
        if (records.length > 0) {
          setHighscore(records[0].score);
        }
      }

      // Sync initial mute state from engine settings
      setIsMuted(gameAudio.getMutedState());
    } catch (e) {
      console.error('Failed to load local game options', e);
    }
  }, []);

  // Sync highscore live when list changes
  const updateHighscoreLive = () => {
    try {
      const storedScores = localStorage.getItem('endless_runner_highscores');
      if (storedScores) {
        const records: HighscoreRecord[] = JSON.parse(storedScores);
        if (records.length > 0) {
          setHighscore(records[0].score);
        }
      }
    } catch (e) {}
  };

  // Keyboard space / escape handler for pausing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'playing' && (e.key === ' ' || e.key === 'Escape' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        togglePause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isPaused, countdown]);

  // Handle ship selections
  const handleSelectDesignId = (id: number) => {
    setSelectedDesignId(id);
    localStorage.setItem('endless_runner_selected_design_id', String(id));
  };

  const handleSelectColorId = (id: string) => {
    setSelectedColorId(id);
    localStorage.setItem('endless_runner_selected_color_id', id);
  };

  const handleSelectExhaustId = (id: 'plasma' | 'nova' | 'sparks' | 'nebula' | 'lightning') => {
    setSelectedExhaustId(id);
    localStorage.setItem('endless_runner_selected_exhaust_id', id);
  };

  // Action: Mute Toggle
  const handleToggleMute = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const muted = gameAudio.toggleMute();
    setIsMuted(muted);
  };

  // Start countdown sequence
  const startCountdown = (onComplete: () => void) => {
    setCountdown(3);
    gameAudio.playCountdownBeep(false);

    let current = 3;
    const interval = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdown(current);
        gameAudio.playCountdownBeep(false);
      } else if (current === 0) {
        setCountdown(0); // GO!
        gameAudio.playCountdownBeep(true);
      } else {
        clearInterval(interval);
        setCountdown(null);
        onComplete();
      }
    }, 1000);
  };

  // Finalize run and credit earned Energizers
  const finalizeRun = () => {
    const earned = Math.floor(score / 10);
    let totalMissionsBonus = 0;

    if (finalStats) {
      const { updatedMissions, bonusAwarded } = processRunMissions(
        finalStats.score,
        finalStats.nearMisses,
        finalStats.timeSurvived
      );
      totalMissionsBonus = bonusAwarded;
      setDailyMissions(updatedMissions);
    }

    const totalEarned = earned + totalMissionsBonus;
    if (totalEarned > 0) {
      setEnergizerBalance((prev) => {
        const next = prev + totalEarned;
        localStorage.setItem('endless_runner_energizer_balance', String(next));
        return next;
      });
    }

    // Reset finalStats after finalizing to prevent double-processing
    setFinalStats(null);
  };

  // Action: Play / Start Game
  const handlePlay = () => {
    setScore(0);
    setCurrentLevel(1);
    setRecordAtStart(highscore); // Save record at the start of this run
    setGameState('playing');
    setResetOnStart(true);
    setReviveCount(0);
    setIsPaused(false);

    startCountdown(() => {
      gameAudio.playBackgroundMusic();
      setResetOnStart(false); // Safeguard: ensure we don't reset when pausing/resuming
    });
  };

  // Action: Toggle Pause
  const togglePause = () => {
    if (gameState === 'playing' && countdown === null) {
      setResetOnStart(false); // Safeguard: ensure we don't reset when pausing/resuming
      setIsPaused((prev) => {
        const next = !prev;
        if (next) {
          gameAudio.stopBackgroundMusic();
        } else {
          gameAudio.playBackgroundMusic();
        }
        return next;
      });
    }
  };

  // Action: Restart Game (Neue Mission)
  const handleRestart = () => {
    finalizeRun();
    gameAudio.stopBackgroundMusic();
    setScore(0);
    setCurrentLevel(1);
    setRecordAtStart(highscore); // Save record at the start of this run
    setGameState('playing');
    setResetOnStart(true);
    setReviveCount(0);
    setIsPaused(false);

    startCountdown(() => {
      gameAudio.playBackgroundMusic();
      setResetOnStart(false); // Safeguard: ensure we don't reset when pausing/resuming
    });
  };

  // Callback from Canvas: Near Miss detected
  const handleNearMiss = useCallback(() => {
    gameAudio.playNearMiss();

    // Spawn score addition popup!
    const id = Date.now() + Math.random();
    setScorePopups((prev) => [...prev, { id, text: '+150' }]);

    // Dismiss popup after animation finishes
    setTimeout(() => {
      setScorePopups((prev) => prev.filter((p) => p.id !== id));
    }, 900);
  }, []);

  // Action: Revive current run (Costs 40, then 80, then 160, etc.)
  const handleRevive = () => {
    const cost = 40 * Math.pow(2, reviveCount);
    if (energizerBalance >= cost) {
      setEnergizerBalance((prev) => {
        const next = prev - cost;
        localStorage.setItem('endless_runner_energizer_balance', String(next));
        return next;
      });
      setReviveCount((prev) => prev + 1);
      gameAudio.stopBackgroundMusic();
      setGameState('playing');
      setResetOnStart(false);
      setReviveTrigger((prev) => prev + 1);
      setIsPaused(false);

      startCountdown(() => {
        gameAudio.playBackgroundMusic();
      });
    }
  };

  // Action: Quit back to Main Menu
  const handleMainMenu = () => {
    finalizeRun();
    gameAudio.stopBackgroundMusic();
    updateHighscoreLive();
    setGameState('menu');
    setReviveCount(0);
    setIsPaused(false);
  };

  // Callback from Canvas: Score update
  const handleScoreUpdate = useCallback((newScore: number) => {
    setScore(newScore);
    // Realtime highscore beat feedback
    if (newScore > highscore) {
      setHighscore(newScore);
    }
  }, [highscore]);

  // Callback from Canvas: Level up
  const handleLevelUpdate = useCallback((newLevel: number) => {
    setCurrentLevel(newLevel);
  }, []);

  // Callback from Canvas: Game over
  const handleGameOver = useCallback((stats: GameStats) => {
    gameAudio.playCrash();
    gameAudio.stopBackgroundMusic();
    setFinalStats(stats);
    setGameState('gameover');
    updateHighscoreLive();
  }, []);

  // Trigger near miss audio beep on score adjustments if near misses trigger points
  useEffect(() => {
    if (gameState === 'playing' && finalStats?.nearMisses !== undefined) {
      // Near miss trigger audio
      gameAudio.playNearMiss();
    }
  }, [finalStats?.nearMisses]);

  const activeColorCombo = COLOR_COMBINATIONS.find((c) => c.id === selectedColorId) || COLOR_COMBINATIONS[0];

  return (
    <div
      id="main_app_wrapper"
      className="relative w-screen h-screen overflow-hidden bg-[#02050f] font-sans text-white select-none"
      onClick={() => {
        // Satisfy browser gesture audio unlocks
        if (gameState === 'playing' && !isPaused && !isMuted) {
          gameAudio.playBackgroundMusic();
        }
      }}
    >
      {/* 1. Core Canvas Game Layer */}
      <GameCanvas
        selectedShipId={`ship_${selectedDesignId}`}
        selectedColorId={selectedColorId}
        selectedExhaustId={selectedExhaustId}
        gameState={gameState === 'playing' && isPaused ? 'paused' : gameState}
        isPaused={isPaused}
        onGameOver={handleGameOver}
        onScoreUpdate={handleScoreUpdate}
        onLevelUpdate={handleLevelUpdate}
        onNearMiss={handleNearMiss}
        isCountdown={countdown !== null}
        reviveTrigger={reviveTrigger}
        resetOnStart={resetOnStart}
      />

      {/* Start Countdown Overlay */}
      {countdown !== null && (
        <div id="countdown_screen_overlay" className="absolute inset-0 flex items-center justify-center bg-black/25 z-30 pointer-events-none">
          <motion.div
            key={countdown}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [1, 1.25, 1], opacity: [1, 1, 0] }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="font-orbitron font-black text-7xl md:text-9xl text-[#00ffcc] tracking-widest drop-shadow-[0_0_25px_rgba(0,255,204,0.6)]"
          >
            {countdown === 0 ? 'GO!' : countdown}
          </motion.div>
        </div>
      )}

      {/* 2. Heads-Up Display (HUD) overlay for real-time info */}
      {gameState === 'playing' && (
        <div id="hud_canvas_overlay" className="absolute inset-x-0 top-0 p-6 flex flex-col items-center pointer-events-none z-10 select-none">
          {/* Centered Minimalist Score Panel */}
          <div className="relative flex flex-col items-center">
            {/* Score Numbers */}
            <div id="hud_score" className="text-3xl md:text-4xl font-black font-orbitron text-white tracking-[0.15em] leading-none text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.25)]">
              {score.toLocaleString()}
            </div>
            
            {/* Record Score */}
            <div id="hud_highscore" className="text-[9px] tracking-widest text-[#00ffcc]/60 font-orbitron mt-1.5 uppercase flex items-center justify-center space-x-1">
              <Trophy className="w-2.5 h-2.5 text-[#ffcc00] fill-current mr-0.5" />
              <span>RECORD: {highscore.toLocaleString()}</span>
            </div>

            {/* Near Miss score animations floating next to/above the score */}
            <div className="absolute -right-16 top-0 flex flex-col space-y-1">
              <AnimatePresence>
                {scorePopups.map((popup) => (
                  <motion.div
                    key={popup.id}
                    initial={{ opacity: 0, y: 15, scale: 0.8 }}
                    animate={{ opacity: [0, 1, 1, 0], y: -25, scale: [0.8, 1.2, 1, 0.9] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.85, ease: 'easeOut' }}
                    className="font-orbitron font-black text-sm text-[#00ffcc] tracking-wider drop-shadow-[0_0_8px_rgba(0,255,204,0.6)]"
                  >
                    {popup.text}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Top Right Utilities (Audio Controls & Pause Trigger) */}
          <div id="hud_controls_right" className="absolute right-6 top-6 flex items-center space-x-2.5 pointer-events-auto">
            {/* Audio Mute Trigger */}
            <button
              id="btn_hud_mute"
              onClick={handleToggleMute}
              className="w-10 h-10 rounded-xl bg-black/45 border border-white/5 backdrop-blur-md flex items-center justify-center text-white/75 hover:text-white hover:border-[#00ffcc]/30 transition-all cursor-pointer hover:shadow-[0_0_10px_rgba(0,255,204,0.1)] active:scale-95"
              title={isMuted ? "Musik an" : "Musik aus"}
            >
              {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5 text-[#00ffcc]" />}
            </button>

            {/* Pause Button */}
            <button
              id="btn_hud_pause"
              onClick={togglePause}
              className="w-10 h-10 rounded-xl bg-black/45 border border-white/5 backdrop-blur-md flex items-center justify-center text-white/75 hover:text-white hover:border-[#ffcc00]/30 transition-all cursor-pointer hover:shadow-[0_0_10px_rgba(255,204,0,0.1)] active:scale-95"
              title="Pause"
            >
              <Pause className="w-4.5 h-4.5 text-[#ffcc00] fill-current" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Screen overlays */}
      <AnimatePresence>
        {gameState === 'menu' && (
          <MainMenu
            selectedDesignId={selectedDesignId}
            onSelectDesignId={handleSelectDesignId}
            selectedColorId={selectedColorId}
            onSelectColorId={handleSelectColorId}
            selectedExhaustId={selectedExhaustId}
            onSelectExhaustId={handleSelectExhaustId}
            onPlay={handlePlay}
            energizerBalance={energizerBalance}
            dailyMissions={dailyMissions}
          />
        )}

        {gameState === 'playing' && isPaused && (
          <PauseMenu
            onResume={togglePause}
            onRestart={handleRestart}
            onMainMenu={handleMainMenu}
            dailyMissions={dailyMissions}
          />
        )}

        {gameState === 'gameover' && finalStats && (
          finalStats.score > recordAtStart && finalStats.score > 0 ? (
            <HighscoreCelebrationMenu
              score={finalStats.score}
              designId={selectedDesignId}
              color={activeColorCombo.primary}
              secondaryColor={activeColorCombo.secondary}
              onRestart={handleRestart}
              onMainMenu={handleMainMenu}
              onRevive={handleRevive}
              energizerBalance={energizerBalance}
              reviveCost={40 * Math.pow(2, reviveCount)}
            />
          ) : (
            <GameOverMenu
              stats={finalStats}
              designId={selectedDesignId}
              color={activeColorCombo.primary}
              secondaryColor={activeColorCombo.secondary}
              onRestart={handleRestart}
              onMainMenu={handleMainMenu}
              onRevive={handleRevive}
              energizerBalance={energizerBalance}
              reviveCost={40 * Math.pow(2, reviveCount)}
            />
          )
        )}
      </AnimatePresence>
    </div>
  );
}
