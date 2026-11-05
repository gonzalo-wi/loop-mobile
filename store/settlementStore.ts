import { create } from 'zustand';

type SettlementState = {
  /** Hay un depósito o una diferencia final que el repartidor todavía no vio (badge de la pestaña). */
  unseen: boolean;
  setUnseen: (unseen: boolean) => void;
};

export const useSettlementStore = create<SettlementState>((set) => ({
  unseen: false,
  setUnseen: (unseen) => set({ unseen }),
}));
