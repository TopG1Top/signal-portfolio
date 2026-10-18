'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isPortfolio } from '../../../packages/shared/portfolio';
type SignalState = {
  mode: 'live' | 'demo';
  category: string;
  source: string;
  country: string;
  q: string;
  hours: number;
  paused: boolean;
  locale: string;
  theme: 'dark' | 'light';
  selected: string | null;
  asOf: string;
  focus: boolean;
  set: (patch: Partial<Omit<SignalState, 'set'>>) => void;
};
export const useSignal = create<SignalState>()(
  persist(
    (set) => ({
      mode: isPortfolio ? 'demo' : 'live',
      category: '',
      source: '',
      country: '',
      q: '',
      hours: 0,
      paused: false,
      locale: 'en',
      theme: 'dark',
      selected: null,
      asOf: '',
      focus: false,
      set: (patch) => set(patch),
    }),
    {
      name: 'signal-preferences',
      partialize: (s) => ({ locale: s.locale, theme: s.theme, mode: s.mode }),
    },
  ),
);
