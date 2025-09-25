import { tauriClient } from "./tauriClient";
import { ListRequest, ListResponse } from "../types/filters";
import { MediaRecord } from "../types/models";

export const mediaApi = {
    async listMedia(req: ListRequest): Promise<ListResponse<MediaRecord>> {
        return tauriClient.call("get_media_list", req);
    },

    async getMediaDetail(mediaId: string) {
        return tauriClient.call("get_media_detail", { mediaId });
    },

    async importMedia(paths: string[]) {
        return tauriClient.call("import_media", { paths });
    },
};
