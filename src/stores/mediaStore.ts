import { create } from "zustand";
import { MediaStoreState } from "../types/store";
import { mediaApi } from "@/api/mediaApi";
import { MediaRecord } from "@/types/models";
import { convertFileSrc } from '@tauri-apps/api/core';

export const useMediaStore = create<MediaStoreState>((set, get) => ({
    photos: [],
    total: 0,
    isLoading: false,
    filters: {},
    sort: { by: "takenDate", order: "desc" },
    pagination: { page: 1, pageSize: 50 },

    addMedia: async (media: MediaRecord[]) => {
        media = media.map(item => {
            console.log(item.path)
            item.path = convertFileSrc(item.path);
            if (item.thumbnailPath) {
                item.thumbnailPath = convertFileSrc(item.thumbnailPath);
            }
            console.log(item.path)
            return item
        })
        set((state) => ({
            photos: [...state.photos, ...media],
            total: media.length,
        }));
    },

    loadMedia: async (opts) => {
        set({ isLoading: true });
        try {
            const { filters, sort, pagination } = get();
            const { page = pagination.page, pageSize = pagination.pageSize } = opts || {};
            const res = await mediaApi.listMedia({ filters, sort, pagination: { page, pageSize } });

            console.log('get media list: ', res)

            // 使用convertFileSrc转换文件路径
            const processedItems = res.items.map(item => {
                const processedItem = { ...item };
                processedItem.path = convertFileSrc(item.path);
                if (item.thumbnailPath) {
                    processedItem.thumbnailPath = convertFileSrc(item.thumbnailPath);
                }
                return processedItem;
            });

            set({ photos: processedItems, total: res.total, isLoading: false });
        } catch (error) {
            console.error('Failed to load media:', error);
            // 设置空列表而不是模拟数据
            set({ photos: [], total: 0, isLoading: false });
        }
    },

    refreshMedia: async () => {
        const { filters, sort, pagination } = get();
        await get().loadMedia({ filters, sort, ...pagination });
    },
}));
