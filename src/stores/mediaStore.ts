import { create } from "zustand";
import { MediaStoreState } from "../types/store";
import { mediaApi } from "@/api/mediaApi";
import { MediaRecord } from "@/types/models";

export const useMediaStore = create<MediaStoreState>((set, get) => ({
    photos: [],
    total: 0,
    isLoading: false,
    filters: {},
    sort: { by: "takenDate", order: "desc" },
    pagination: { page: 1, pageSize: 50 },

    addMedia: async (media: MediaRecord[]) => {
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

            // 添加模拟数据用于测试
            const mockMedia = [
                {
                    id: '1',
                    name: '风景照片1.jpg',
                    path: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
                    kind: 'image',
                    size: 2456789,
                    width: 1920,
                    height: 1080,
                    takenDate: new Date('2024-01-15').toISOString(),
                    tags: ['风景', '自然', '山脉'],
                    thumbnailPath: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=150&fit=crop'
                },
                {
                    id: '2',
                    name: '城市夜景.jpg',
                    path: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&h=600&fit=crop',
                    kind: 'image',
                    size: 3123456,
                    width: 2048,
                    height: 1365,
                    takenDate: new Date('2024-02-20').toISOString(),
                    tags: ['城市', '夜景', '建筑'],
                    thumbnailPath: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=200&h=150&fit=crop'
                },
                {
                    id: '3',
                    name: '海滩日落.jpg',
                    path: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop',
                    kind: 'image',
                    size: 2987654,
                    width: 1920,
                    height: 1280,
                    takenDate: new Date('2024-03-10').toISOString(),
                    tags: ['海滩', '日落', '海洋'],
                    thumbnailPath: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=150&fit=crop'
                },
                {
                    id: '4',
                    name: '森林小径.jpg',
                    path: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
                    kind: 'image',
                    size: 2678901,
                    width: 2560,
                    height: 1440,
                    takenDate: new Date('2024-04-05').toISOString(),
                    tags: ['森林', '自然', '小径'],
                    thumbnailPath: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=150&fit=crop'
                },
                {
                    id: '5',
                    name: '雪山风光.jpg',
                    path: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop',
                    kind: 'image',
                    size: 3456789,
                    width: 1920,
                    height: 1080,
                    takenDate: new Date('2024-05-12').toISOString(),
                    tags: ['雪山', '冬季', '风景'],
                    thumbnailPath: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&h=150&fit=crop'
                }
            ];

            // 合并API数据和模拟数据
            const allItems = [...mockMedia, ...(res.items || [])] as MediaRecord[];
            set({ photos: allItems, total: allItems.length, isLoading: false });
        } catch (error) {
            console.error('Failed to load media:', error);
            // 使用模拟数据作为后备
            const mockMedia = [
                {
                    id: '1',
                    name: '风景照片1.jpg',
                    path: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
                    kind: 'image',
                    size: 2456789,
                    width: 1920,
                    height: 1080,
                    takenDate: new Date('2024-01-15').toISOString(),
                    tags: ['风景', '自然', '山脉'],
                    thumbnailPath: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=150&fit=crop'
                },
                {
                    id: '2',
                    name: '城市夜景.jpg',
                    path: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&h=600&fit=crop',
                    kind: 'image',
                    size: 3123456,
                    width: 2048,
                    height: 1365,
                    takenDate: new Date('2024-02-20').toISOString(),
                    tags: ['城市', '夜景', '建筑'],
                    thumbnailPath: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=200&h=150&fit=crop'
                },
                {
                    id: '3',
                    name: '海滩日落.jpg',
                    path: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop',
                    kind: 'image',
                    size: 2987654,
                    width: 1920,
                    height: 1280,
                    takenDate: new Date('2024-03-10').toISOString(),
                    tags: ['海滩', '日落', '海洋'],
                    thumbnailPath: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=150&fit=crop'
                }
            ];
            set({ photos: mockMedia as MediaRecord[], total: mockMedia.length, isLoading: false });
        }
    },

    refreshMedia: async () => {
        const { filters, sort, pagination } = get();
        await get().loadMedia({ filters, sort, ...pagination });
    },
}));
