import { tauriClient } from "./tauriClient";
import { ListRequest, ListResponse } from "../types/filters";
import { MediaRecord } from "../types/models";

export const mediaApi = {
    async listMedia(req: ListRequest): Promise<ListResponse<MediaRecord>> {
        // 从数据库获取所有媒体记录
        const allRecords = await tauriClient.call<MediaRecord[]>("get_media_list");

        // 简单分页和过滤实现
        const { pagination = { page: 1, pageSize: 20 }, sort, filters } = req;
        let filteredRecords = allRecords;

        // 应用关键词过滤
        if (filters?.query) {
            const keyword = filters.query.toLowerCase();
            filteredRecords = filteredRecords.filter(record =>
                record.name.toLowerCase().includes(keyword) ||
                record.path.toLowerCase().includes(keyword)
            );
        }

        // 应用媒体类型过滤
        if (filters?.kind) {
            filteredRecords = filteredRecords.filter(record =>
                record.kind === filters.kind
            );
        }

        // 排序
        if (sort?.by) {
            filteredRecords.sort((a, b) => {
                let aValue: any, bValue: any;

                switch (sort.by) {
                    case 'takenDate':
                        aValue = a.takenDate ? new Date(a.takenDate) : new Date(0);
                        bValue = b.takenDate ? new Date(b.takenDate) : new Date(0);
                        break;
                    case 'name':
                        aValue = a.name;
                        bValue = b.name;
                        break;
                    case 'size':
                        aValue = a.size || 0;
                        bValue = b.size || 0;
                        break;
                    case 'createdAt':
                        aValue = new Date(a.createdAt);
                        bValue = new Date(b.createdAt);
                        break;
                    case 'updatedAt':
                        aValue = new Date(a.updatedAt);
                        bValue = new Date(b.updatedAt);
                        break;
                    default:
                        return 0;
                }

                if (sort.order === 'desc') {
                    return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
                } else {
                    return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
                }
            });
        }

        // 分页
        const startIndex = (pagination.page - 1) * pagination.pageSize;
        const endIndex = startIndex + pagination.pageSize;
        const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

        return {
            items: paginatedRecords,
            total: filteredRecords.length,
            page: pagination.page,
            pageSize: pagination.pageSize
        };
    },

    async getMediaDetail(mediaId: string): Promise<MediaRecord | null> {
        return tauriClient.call<MediaRecord | null>("get_media_detail", { mediaId });
    },

    async importMedia(paths: string[]): Promise<MediaRecord[]> {
        return tauriClient.call<MediaRecord[]>("get_media_records_with_db", { paths });
    },

    async deleteSelectedMedia(mediaIds: string[]): Promise<number> {
        return tauriClient.call<number>("delete_selected_media", { mediaIds });
    },

    async deleteAllMedia(): Promise<string> {
        return tauriClient.call<string>("delete_all_media");
    },
};
