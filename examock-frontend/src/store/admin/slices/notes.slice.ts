import type { StateCreator } from "zustand";
import type { AdminStore } from "../types/admin.store.types";
import { getNotesApi, createNoteApi, updateNoteApi, deleteNoteApi } from "../../../api/admin.api";
import type {
  Note,
  CreateNoteDto,
  UpdateNoteDto,
  GetNotesFilters,
} from "../types/admin.types";

// ─── Slice state + actions ────────────────────────────────────────────────────

export interface NotesSlice {
  // State
  notes: Note[];
  notesTotal: number;
  notesPage: number;
  notesLimit: number;
  notesLoading: boolean;
  notesError: string | null;
  notesFilters: GetNotesFilters;

  // Actions
  fetchNotes: (filters?: GetNotesFilters) => Promise<void>;
  createNote: (dto: CreateNoteDto) => Promise<void>;
  updateNote: (id: string, dto: UpdateNoteDto) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  setNotesFilters: (filters: GetNotesFilters) => void;
  resetNotesFilters: () => void;
}

const DEFAULT_FILTERS: GetNotesFilters = {
  page: 1,
  limit: 20,
};

// ─── Slice factory ────────────────────────────────────────────────────────────

export const createNotesSlice: StateCreator<
  AdminStore,
  [],
  [],
  NotesSlice
> = (set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  notes: [],
  notesTotal: 0,
  notesPage: 1,
  notesLimit: 20,
  notesLoading: false,
  notesError: null,
  notesFilters: DEFAULT_FILTERS,

  // ── fetchNotes ─────────────────────────────────────────────────────────────
  fetchNotes: async (filters?: GetNotesFilters) => {
    const merged = { ...get().notesFilters, ...filters };
    set({ notesLoading: true, notesError: null, notesFilters: merged });
    try {
      const res = await getNotesApi(merged);
      set({
        notes: res.notes,
        notesTotal: res.total,
        notesPage: res.page,
        notesLimit: res.limit,
      });
    } catch (err: any) {
      set({ notesError: err?.response?.data?.message ?? "Failed to fetch notes" });
    } finally {
      set({ notesLoading: false });
    }
  },

  // ── createNote ─────────────────────────────────────────────────────────────
  createNote: async (dto: CreateNoteDto) => {
    set({ notesLoading: true, notesError: null });
    try {
      const formData = new FormData();
      formData.append("examTypeId", dto.examTypeId);
      formData.append("title", dto.title);
      formData.append("file", dto.file);
      formData.append("isFree", String(dto.isFree));
      if (dto.topicId)   formData.append("topicId", dto.topicId);
      if (dto.subjectId) formData.append("subjectId", dto.subjectId);

      await createNoteApi(formData);
      // Re-fetch with current filters to keep list fresh
      await get().fetchNotes();
    } catch (err: any) {
      set({ notesError: err?.response?.data?.message ?? "Failed to create note" });
      throw err; // re-throw so UI can react
    } finally {
      set({ notesLoading: false });
    }
  },

  // ── updateNote ─────────────────────────────────────────────────────────────
  updateNote: async (id: string, dto: UpdateNoteDto) => {
    set({ notesLoading: true, notesError: null });
    try {
      const updated = await updateNoteApi(id, dto);
      // Optimistic-style: patch the single note in the list
      set((s) => ({
        notes: s.notes.map((n) => (n.id === id ? { ...n, ...updated.note ?? dto } : n)),
      }));
    } catch (err: any) {
      set({ notesError: err?.response?.data?.message ?? "Failed to update note" });
      throw err;
    } finally {
      set({ notesLoading: false });
    }
  },

  // ── deleteNote (soft) ──────────────────────────────────────────────────────
  deleteNote: async (id: string) => {
    set({ notesLoading: true, notesError: null });
    try {
      await deleteNoteApi(id);
      // Remove from local list immediately (it's soft-deleted / isActive=false)
      set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    } catch (err: any) {
      set({ notesError: err?.response?.data?.message ?? "Failed to delete note" });
      throw err;
    } finally {
      set({ notesLoading: false });
    }
  },

  // ── Filter helpers ─────────────────────────────────────────────────────────
  setNotesFilters: (filters: GetNotesFilters) => {
    set((s) => ({ notesFilters: { ...s.notesFilters, ...filters } }));
  },

  resetNotesFilters: () => {
    set({ notesFilters: DEFAULT_FILTERS });
  },
});