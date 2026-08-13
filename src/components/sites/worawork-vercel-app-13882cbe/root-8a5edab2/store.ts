import { create } from "zustand";

export type PortfolioPageId = "about" | "experience" | "arts" | "behind-scenes";
export type SensorName = string | null;

interface WoraWorkState {
  started: boolean;
  introPlaying: boolean;
  showGreetingText: boolean;
  showControls: boolean;
  muted: boolean;
  currentTouchingObject: SensorName;
  currentPage: PortfolioPageId;
  mailboxOpen: boolean;
  portfolioOpen: boolean;
  inside: boolean;
  litSensors: Record<string, boolean>;
  sittingOn: SensorName;

  start: () => void;
  endIntro: () => void;
  setShowGreetingText: (v: boolean) => void;
  toggleControls: (v?: boolean) => void;
  toggleMuted: () => void;
  setTouching: (s: SensorName) => void;
  setCurrentPage: (p: PortfolioPageId) => void;
  setMailboxOpen: (v: boolean) => void;
  setPortfolioOpen: (v: boolean) => void;
  setInside: (v: boolean) => void;
  toggleLight: (baseName: string) => void;
  setSittingOn: (s: SensorName) => void;
}

export const useWoraWorkStore = create<WoraWorkState>((set) => ({
  started: false,
  introPlaying: false,
  showGreetingText: false,
  showControls: false,
  muted: true,
  currentTouchingObject: null,
  currentPage: "about",
  mailboxOpen: false,
  portfolioOpen: false,
  inside: false,
  litSensors: {},
  sittingOn: null,

  start: () => set({ started: true, introPlaying: true }),
  endIntro: () => set({ introPlaying: false, showGreetingText: false }),
  setShowGreetingText: (showGreetingText) => set({ showGreetingText }),
  toggleControls: (v) => set((s) => ({ showControls: v ?? !s.showControls })),
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  setTouching: (currentTouchingObject) => set({ currentTouchingObject }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setMailboxOpen: (mailboxOpen) => set({ mailboxOpen }),
  setPortfolioOpen: (portfolioOpen) => set({ portfolioOpen }),
  setInside: (inside) => set({ inside }),
  toggleLight: (baseName) =>
    set((s) => ({ litSensors: { ...s.litSensors, [baseName]: !s.litSensors[baseName] } })),
  setSittingOn: (sittingOn) => set({ sittingOn }),
}));
