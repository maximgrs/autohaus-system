import { create } from "zustand";
import { persist } from "zustand/middleware";
import { zustandStorage } from "./storage";

type AppState = {
    // NOTE: scaffolding for later steps (dealer/employee/account selection logic)
    activeDealerId: string | null;
    activeEmployeeId: string | null;

    setActiveDealerId: (id: string | null) => void;
    setActiveEmployeeId: (id: string | null) => void;

    resetSelections: () => void;
};

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            activeDealerId: null,
            activeEmployeeId: null,

            setActiveDealerId: (id) => set({ activeDealerId: id }),
            setActiveEmployeeId: (id) => set({ activeEmployeeId: id }),

            resetSelections: () =>
                set({ activeDealerId: null, activeEmployeeId: null }),
        }),
        {
            name: "app-store-v1",
            storage: zustandStorage,
            version: 1,
        },
    ),
);
