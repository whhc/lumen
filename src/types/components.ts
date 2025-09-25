import { UUID } from "./utils";
import { MediaRecord, AlbumRecord } from "./models";

export interface PhotoGridProps {
    photos: MediaRecord[];
    onSelect?: (id: UUID) => void;
    onDoubleClick?: (id: UUID) => void;
}

export interface AlbumListProps {
    albums: AlbumRecord[];
    onSelect?: (albumId: UUID) => void;
}