// ページネーション付き検索結果の型定義
export interface PaginatedResult<T> {
  hits: T[];
  totalHits: number;
  totalPages: number;
  page: number;
  hitsPerPage: number;
}

// 1ページあたりの表示件数
export const DEFAULT_HITS_PER_PAGE = 24;
