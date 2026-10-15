// store/admin/slices/analytics.slice.ts
import type { StateCreator } from "zustand";
import type { AdminStore } from "../types/admin.store.types";
import {
  getOverviewApi,
  getTestAnalyticsApi,
  getPaymentRecordsApi,
  getEventsSummaryApi,
} from "../../../api/admin.api";
import type {
  AnalyticsOverview,
  TestAnalyticsRow,
  PaymentRecord,
  PaymentStatus,
  EventsSummary,
} from "../../../types/admin.types";

export interface AnalyticsSlice {
  overview: AnalyticsOverview | null;
  overviewLoading: boolean;
  testAnalytics: TestAnalyticsRow[];
  testAnalyticsLoading: boolean;
  payments: PaymentRecord[];
  paymentsTotal: number;
  paymentsPage: number;
  paymentsLimit: number;
  paymentsStatus: PaymentStatus | "";
  analyticsError: string | null;

  // Ticket 38 — product-event funnel (GET /api/events/summary)
  events: EventsSummary | null;
  eventsLoading: boolean;
  eventsDays: number;

  fetchOverview: () => Promise<void>;
  fetchTestAnalytics: () => Promise<void>;
  fetchPayments: (page?: number, status?: PaymentStatus | "") => Promise<void>;
  setPaymentsStatus: (status: PaymentStatus | "") => void;
  fetchEvents: (days?: number) => Promise<void>;
}

export const createAnalyticsSlice: StateCreator<
  AdminStore,
  [],
  [],
  AnalyticsSlice
> = (set, get) => ({
  overview: null,
  overviewLoading: false,
  testAnalytics: [],
  testAnalyticsLoading: false,
  payments: [],
  paymentsTotal: 0,
  paymentsPage: 1,
  paymentsLimit: 20,
  paymentsStatus: "",
  analyticsError: null,

  events: null,
  eventsLoading: false,
  eventsDays: 7,

  fetchOverview: async () => {
    set({ overviewLoading: true, analyticsError: null });
    try {
      const data: AnalyticsOverview = await getOverviewApi();
      set({ overview: data, analyticsError: null });
    } catch (error) {
      set({ analyticsError: (error as Error).message });
    } finally {
      set({ overviewLoading: false });
    }
  },

  fetchTestAnalytics: async () => {
    set({ testAnalyticsLoading: true, analyticsError: null });
    try {
      const data: TestAnalyticsRow[] = await getTestAnalyticsApi();
      set({ testAnalytics: data, analyticsError: null });
    } catch (error) {
      set({ analyticsError: (error as Error).message });
    } finally {
      set({ testAnalyticsLoading: false });
    }
  },

  fetchPayments: async (page, status) => {
    const p = page ?? get().paymentsPage;
    const s = status ?? get().paymentsStatus;
    set({ analyticsError: null, paymentsPage: p });
    try {
      const res = await getPaymentRecordsApi(p, s || undefined);
      set({
        payments: res.payments,
        paymentsTotal: res.total,
        paymentsPage: res.page,
        paymentsLimit: res.limit,
        analyticsError: null,
      });
    } catch (error) {
      set({ analyticsError: (error as Error).message });
    }
  },

  setPaymentsStatus: (status) => {
    set({ paymentsStatus: status, paymentsPage: 1 });
  },

  fetchEvents: async (days) => {
    const d = days ?? get().eventsDays;
    set({ eventsLoading: true, eventsDays: d, analyticsError: null });
    try {
      const data: EventsSummary = await getEventsSummaryApi(d);
      set({ events: data, analyticsError: null });
    } catch (error) {
      set({ analyticsError: (error as Error).message });
    } finally {
      set({ eventsLoading: false });
    }
  },
});
