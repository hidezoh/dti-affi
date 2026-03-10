import type { Video } from "./video.js";

/** ページネーション付き検索結果 */
export interface PaginatedResult<T> {
  hits: T[];
  totalHits: number;
  page: number;
  totalPages: number;
  hitsPerPage: number;
}

/** ページネーション付き動画検索結果 */
export type PaginatedVideoResult = PaginatedResult<Video>;
