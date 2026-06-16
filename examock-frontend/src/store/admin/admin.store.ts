// store/admin/admin.store.ts

import { create } from "zustand";
import type { AdminStore } from "./types/admin.store.types";
import { createSubjectsSlice } from "./slices/subjects.slice";

export const useAdminStore = create<AdminStore>()((...a) => ({
  ...createSubjectsSlice(...a),
}));