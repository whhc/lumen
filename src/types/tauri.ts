import { UUID } from "./utils";
import { MediaRecord, AlbumRecord, FaceRecord, TagRecord } from "./models";

export type TauriEventName =
    | "import-progress"
    | "import-complete"
    | "thumbnail-generated"
    | "faces-detected"
    | "media-updated"
    | "album-updated"
    | "tag-updated"
    | "images-deal-progress";

export interface ImagesDealProgressEvent {
    current: number;
    total: number;
    currentFile?: string;
    step: "scanning" | "generating_thumbnails" | "extracting_metadata" | "completed";
}

export interface ImportProgressEvent {
    current: number;
    total: number;
    path?: string;
}

export interface ImportCompleteEvent {
    importedCount: number;
}

export interface ThumbnailGeneratedEvent {
    mediaId: UUID;
    thumbnailPath: string;
}

export interface FacesDetectedEvent {
    mediaId: UUID;
    faces: FaceRecord[];
}

export type TauriEventPayloadMap = {
    "import-progress": ImportProgressEvent;
    "import-complete": ImportCompleteEvent;
    "thumbnail-generated": ThumbnailGeneratedEvent;
    "faces-detected": FacesDetectedEvent;
    "media-updated": MediaRecord;
    "album-updated": AlbumRecord;
    "tag-updated": TagRecord;
    "images-deal-progress": ImagesDealProgressEvent;
};