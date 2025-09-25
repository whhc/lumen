export interface Pagination {
    page: number;
    pageSize: number;
}

export interface SortOptions {
    by: "takenDate" | "name" | "size" | "createdAt" | "updatedAt";
    order: "asc" | "desc";
}

export interface FilterOptions {
    query?: string;
    dateFrom?: string | null;
    dateTo?: string | null;
    tags?: string[];
    albumIds?: string[];
    personIds?: string[];
    kind?: string | null;
}

export interface ListRequest {
    pagination?: Pagination;
    sort?: SortOptions;
    filters?: FilterOptions;
}

export interface ListResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}