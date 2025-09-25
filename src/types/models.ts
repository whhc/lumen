import { Timestamp, UUID } from "./utils";

export enum MediaKind {
    Image = "image",
    Video = "video",
    Other = "other",
}

export interface MediaRecord {
    id: UUID;
    path: string;
    name: string;
    kind: MediaKind;
    mimeType?: string;
    size?: number;
    width?: number;
    height?: number;
    duration?: number;
    thumbnailPath?: string;
    takenDate?: Timestamp | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    tags?: string[];
    albumIds?: UUID[];
    facesCount?: number;
}

export interface MetadataRecord {
    id: UUID;
    mediaId: UUID;
    cameraMake?: string | null;
    cameraModel?: string | null;
    gpsLatitude?: number | null;
    gpsLongitude?: number | null;
    width?: number | null;
    height?: number | null;
}

export interface FaceRecord {
    id: UUID;
    mediaId: UUID;
    personId?: UUID | null;
    bbox: [number, number, number, number];
    confidence?: number | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface PersonRecord {
    id: UUID;
    name?: string | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface AlbumRecord {
    id: UUID;
    name: string;
    description?: string | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface TagRecord {
    id: UUID;
    name: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}