import { create } from 'zustand';

/**
 * The one-off "séria sa predĺžila" moment after saving a zápisok.
 *
 * Lives outside the editor because the editor closes on save — the popup is
 * shown by the root layout, over whatever screen the user lands back on.
 */

export interface StreakMoment {
  from: number;
  to: number;
  /** the run is now longer than any before it */
  record: boolean;
}

interface CelebrationState {
  streak: StreakMoment | null;
  celebrateStreak: (moment: StreakMoment) => void;
  dismiss: () => void;
}

export const useCelebration = create<CelebrationState>((set) => ({
  streak: null,
  celebrateStreak: (streak) => set({ streak }),
  dismiss: () => set({ streak: null }),
}));
