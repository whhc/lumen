export type UUID = string;
export type Timestamp = string;

export type Nullable<T> = T | null;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;