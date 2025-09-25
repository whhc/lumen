import { tauriClient } from "./tauriClient";
import { AlbumRecord } from "../types/models";

export const albumApi = {
    async listAlbums(): Promise<AlbumRecord[]> {
        return tauriClient.call("get_albums");
    },

    async createAlbum(name: string): Promise<AlbumRecord> {
        return tauriClient.call("create_album", { name });
    },

    async deleteAlbum(albumId: string): Promise<void> {
        return tauriClient.call("delete_album", { albumId });
    },
};
