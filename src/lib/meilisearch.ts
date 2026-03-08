import { MeiliSearch } from 'meilisearch';
import type { Video } from '../types/video.js';

// Meilisearch接続設定
const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
const MEILISEARCH_ADMIN_API_KEY = process.env.MEILISEARCH_ADMIN_API_KEY || '';
const MEILISEARCH_SEARCH_API_KEY = process.env.MEILISEARCH_SEARCH_API_KEY || '';

// インデックス名
export const VIDEOS_INDEX = 'videos';

// 管理用クライアント（インデックス作成・データ投入用）
export function createAdminClient(): MeiliSearch {
  if (!MEILISEARCH_HOST) {
    throw new Error('MEILISEARCH_HOST が設定されていません');
  }
  if (!MEILISEARCH_ADMIN_API_KEY) {
    throw new Error('MEILISEARCH_ADMIN_API_KEY が設定されていません');
  }
  return new MeiliSearch({
    host: MEILISEARCH_HOST,
    apiKey: MEILISEARCH_ADMIN_API_KEY,
  });
}

// 検索用クライアント（フロントエンド検索用）
export function createSearchClient(): MeiliSearch {
  if (!MEILISEARCH_HOST) {
    throw new Error('MEILISEARCH_HOST が設定されていません');
  }
  return new MeiliSearch({
    host: MEILISEARCH_HOST,
    apiKey: MEILISEARCH_SEARCH_API_KEY || MEILISEARCH_ADMIN_API_KEY,
  });
}

// 共通型を再エクスポート（後方互換）
export type { Video };
export type { Video as MeilisearchVideo };

// videosインデックスの設定
export const VIDEOS_INDEX_SETTINGS = {
  // 検索対象フィールド（優先度順）
  searchableAttributes: [
    'title',
    'actress',
    'description',
    'site_name',
    'provider_name',
  ],
  // フィルタ可能フィールド
  filterableAttributes: [
    'site_id',
    'site_name',
    'release_date',
    'actress',
    'provider_name',
  ],
  // ソート可能フィールド
  sortableAttributes: [
    'release_date',
  ],
  // ランキングルール
  rankingRules: [
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
  ],
  // 表示対象フィールド
  displayedAttributes: [
    'id',
    'site_id',
    'site_name',
    'title',
    'actress',
    'description',
    'release_date',
    'sample_url',
    'aff_link',
    'original_id',
    'sample_movie_url_2',
    'provider_name',
  ],
} as const;

// バッチサイズ（Meilisearchへの一括投入時）
export const BATCH_SIZE = 1000;
