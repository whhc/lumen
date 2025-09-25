import { MediaRecord, AlbumRecord } from "./models";
import { FilterOptions, Pagination, SortOptions } from "./filters";
import { UUID } from "./utils";

export interface MediaStoreState {
    photos: MediaRecord[];
    total: number;
    isLoading: boolean;
    filters: FilterOptions;
    sort: SortOptions;
    pagination: Pagination;

    loadMedia: (opts?: Partial<Pagination & { filters: FilterOptions; sort: SortOptions }>) => Promise<void>;
    refreshMedia: () => Promise<void>;
}

export interface AlbumStoreState {
    albums: AlbumRecord[];
    isLoading: boolean;

    loadAlbums: () => Promise<void>;
    createAlbum: (name: string) => Promise<AlbumRecord>;
    deleteAlbum: (albumId: UUID) => Promise<void>;
}

export interface UIStoreState {
    isPreviewOpen: boolean;
    previewMediaId?: UUID | null;
    toast?: { message: string; type?: "info" | "success" | "error" } | null;

    openPreview: (mediaId: UUID) => void;
    closePreview: () => void;
    setToast: (msg: string, type?: "info" | "success" | "error") => void;
}
