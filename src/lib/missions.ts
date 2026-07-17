export interface DailyMission {
  id: string;
  description: string;
  type: 'distance' | 'near_misses' | 'survival';
  target: number;
  current: number;
  reward: number;
  completed: boolean;
  claimed: boolean; // Auto-claimed or manually claimed
}

const MISSIONS_KEY = 'neon_flight_daily_missions';
const MISSIONS_DATE_KEY = 'neon_flight_daily_missions_date';

export function getOrCreateDailyMissions(): DailyMission[] {
  const todayStr = new Date().toDateString(); // e.g. "Tue Jul 14 2026"
  const storedDate = localStorage.getItem(MISSIONS_DATE_KEY);
  const storedMissions = localStorage.getItem(MISSIONS_KEY);

  if (storedDate === todayStr && storedMissions) {
    try {
      return JSON.parse(storedMissions);
    } catch (e) {
      console.error('Failed to parse daily missions', e);
    }
  }

  // It's a new day or no missions exist. Generate a fresh set of daily missions!
  const defaultMissions: DailyMission[] = [
    {
      id: 'mission_fly_distance',
      description: 'Fliege insgesamt 5.000 Meter',
      type: 'distance',
      target: 5000,
      current: 0,
      reward: 150,
      completed: false,
      claimed: false,
    },
    {
      id: 'mission_near_misses',
      description: 'Überstehe 10 knappe Vorbeiflüge (Near Misses)',
      type: 'near_misses',
      target: 10,
      current: 0,
      reward: 200,
      completed: false,
      claimed: false,
    },
    {
      id: 'mission_survival_time',
      description: 'Überlebe insgesamt 120 Sekunden im All',
      type: 'survival',
      target: 120,
      current: 0,
      reward: 100,
      completed: false,
      claimed: false,
    },
  ];

  localStorage.setItem(MISSIONS_DATE_KEY, todayStr);
  localStorage.setItem(MISSIONS_KEY, JSON.stringify(defaultMissions));
  return defaultMissions;
}

/**
 * Updates progress on the daily missions based on a finished run's stats.
 * Returns the updated missions list and the total newly awarded bonus energizers.
 */
export function processRunMissions(
  score: number,
  nearMisses: number,
  timeSurvivedSeconds: number
): { updatedMissions: DailyMission[]; bonusAwarded: number } {
  const missions = getOrCreateDailyMissions();
  let bonusAwarded = 0;
  let changed = false;

  const nextMissions = missions.map((mission) => {
    if (mission.completed) {
      return mission;
    }

    let progressAdd = 0;
    if (mission.type === 'distance') {
      progressAdd = score; // 1 point = 1 meter
    } else if (mission.type === 'near_misses') {
      progressAdd = nearMisses;
    } else if (mission.type === 'survival') {
      progressAdd = timeSurvivedSeconds;
    }

    if (progressAdd > 0) {
      changed = true;
      const nextCurrent = Math.min(mission.target, mission.current + progressAdd);
      const nextCompleted = nextCurrent >= mission.target;
      let nextClaimed = mission.claimed;

      if (nextCompleted && !mission.completed) {
        bonusAwarded += mission.reward;
        nextClaimed = true; // Auto-claimed on completion
      }

      return {
        ...mission,
        current: nextCurrent,
        completed: nextCompleted,
        claimed: nextClaimed,
      };
    }

    return mission;
  });

  if (changed) {
    localStorage.setItem(MISSIONS_KEY, JSON.stringify(nextMissions));
  }

  return {
    updatedMissions: nextMissions,
    bonusAwarded,
  };
}
