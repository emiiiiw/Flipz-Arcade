"use client";

import { create } from "zustand";

export type SessionSlice = {
  displayName: string | null;
  balance: number;
  sessionId: string | null;
  totalDeposited: number;
  totalWagered: number;
  totalWon: number;
  setFromServer: (p: {
    displayName: string;
    balance: number;
    sessionId: string;
    totalDeposited: number;
    totalWagered: number;
    totalWon: number;
  }) => void;
  patchBalance: (balance: number) => void;
  clear: () => void;
};

export const useSessionStore = create<SessionSlice>((set) => ({
  displayName: null,
  balance: 0,
  sessionId: null,
  totalDeposited: 0,
  totalWagered: 0,
  totalWon: 0,
  setFromServer: (p) =>
    set({
      displayName: p.displayName,
      balance: p.balance,
      sessionId: p.sessionId,
      totalDeposited: p.totalDeposited,
      totalWagered: p.totalWagered,
      totalWon: p.totalWon,
    }),
  patchBalance: (balance) => set({ balance }),
  clear: () =>
    set({
      displayName: null,
      balance: 0,
      sessionId: null,
      totalDeposited: 0,
      totalWagered: 0,
      totalWon: 0,
    }),
}));
