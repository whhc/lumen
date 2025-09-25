import { create } from "zustand";
import { MediaStoreState } from "../types/store";
import { mediaApi } from "@/api/mediaApi";

export const useMediaStore = create<MediaStoreState>((set, get) => ({
    photos: [],
    total: 0,
    isLoading: false,
    filters: {},
    sort: { by: "takenDate", order: "desc" },
    pagination: { page: 1, pageSize: 50 },

    loadMedia: async (opts) => {
        set({ isLoading: true });
        const { filters, sort, pagination } = get();
        const { page = pagination.page, pageSize = pagination.pageSize } = opts || {};
        const res = await mediaApi.listMedia({ filters, sort, pagination: { page, pageSize } });
        set({ photos: res.items, total: res.total, isLoading: false });
    },

    refreshMedia: async () => {
        const { filters, sort, pagination } = get();
        await get().loadMedia({ filters, sort, ...pagination });
    },
}));
