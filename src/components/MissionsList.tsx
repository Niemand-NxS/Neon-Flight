import React from 'react';
import { DailyMission } from '../lib/missions';
import { Compass, Zap, Clock, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface MissionsListProps {
  missions: DailyMission[];
  title?: string;
  compact?: boolean;
}

export default function MissionsList({ missions, title = 'TÄGLICHE MISSIONEN', compact = false }: MissionsListProps) {
  return (
    <div className={`flex flex-col space-y-3 w-full bg-black/40 border border-white/10 rounded-xl ${compact ? 'p-3' : 'p-4 md:p-5'}`}>
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#00ffcc] animate-pulse" />
          <h4 className="font-orbitron font-bold text-xs tracking-widest text-[#00ffcc] uppercase">
            {title}
          </h4>
        </div>
        <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">
          Reset Täglich
        </span>
      </div>

      <div className="flex flex-col space-y-3">
        {missions.map((mission) => {
          // Select correct icon based on mission type
          let Icon = Compass;
          let iconColor = 'text-cyan-400';
          let progressUnit = 'm';

          if (mission.type === 'near_misses') {
            Icon = Zap;
            iconColor = 'text-amber-400 animate-pulse';
            progressUnit = '';
          } else if (mission.type === 'survival') {
            Icon = Clock;
            iconColor = 'text-pink-400';
            progressUnit = 's';
          }

          const progressPercent = Math.min(100, Math.round((mission.current / mission.target) * 100));

          return (
            <div
              key={mission.id}
              className={`relative flex flex-col p-2.5 rounded-lg border transition-all ${
                mission.completed
                  ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.05)]'
                  : 'bg-white/5 border-white/5 hover:border-white/10'
              }`}
            >
              {/* Mission Details */}
              <div className="flex items-start justify-between space-x-2 mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`p-1 rounded bg-black/30 ${iconColor}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className={`font-medium tracking-wide text-left ${compact ? 'text-[11px]' : 'text-xs'} ${mission.completed ? 'text-emerald-400' : 'text-white/80'}`}>
                    {mission.description}
                  </span>
                </div>

                {/* Reward Badge */}
                <div className="flex items-center space-x-1 font-orbitron font-bold text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded shrink-0">
                  <Zap className="w-2.5 h-2.5 fill-current" />
                  <span>+{mission.reward}</span>
                </div>
              </div>

              {/* Progress Bar & Numerical stats */}
              <div className="flex items-center space-x-3">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${mission.completed ? 'bg-emerald-400' : 'bg-[#00ffcc]'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex items-center space-x-1.5 min-w-[50px] justify-end">
                  {mission.completed ? (
                    <div className="flex items-center text-emerald-400 text-[10px] font-orbitron font-bold tracking-widest space-x-0.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>OFF</span>
                    </div>
                  ) : (
                    <span className="font-mono text-[10px] text-white/50 tracking-tight shrink-0">
                      {Math.floor(mission.current)}{progressUnit} / {mission.target}{progressUnit}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
