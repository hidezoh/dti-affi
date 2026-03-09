import { MeiliSearch } from 'meilisearch';
import type { Video } from '../types/video.js';
import type { Env } from '../types/env.js';

// インデックス名
export const VIDEOS_INDEX = 'videos';

// 検索用クライアント（Cloudflare Workers環境変数から取得）
export function createSearchClient(env: Env): MeiliSearch {
  if (!env.MEILISEARCH_HOST) {
    throw new Error('MEILISEARCH_HOST が設定されていません');
  }
  return new MeiliSearch({
    host: env.MEILISEARCH_HOST,
    apiKey: env.MEILISEARCH_SEARCH_API_KEY || env.MEILISEARCH_ADMIN_API_KEY || '',
  });
}

// 管理用クライアント（スクリプト用 - 環境変数から直接取得）
export function createAdminClient(): MeiliSearch {
  const host = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
  const apiKey = process.env.MEILISEARCH_ADMIN_API_KEY || '';
  if (!host) {
    throw new Error('MEILISEARCH_HOST が設定されていません');
  }
  if (!apiKey) {
    throw new Error('MEILISEARCH_ADMIN_API_KEY が設定されていません');
  }
  return new MeiliSearch({ host, apiKey });
}

// 最新動画を取得
export async function getLatestVideos(env: Env, limit = 24): Promise<Video[]> {
  const client = createSearchClient(env);
  const index = client.index(VIDEOS_INDEX);
  const result = await index.search('', {
    limit,
    sort: ['release_date:desc'],
  });
  return result.hits as Video[];
}

// IDで動画を取得
export async function getVideoById(env: Env, id: string): Promise<Video | null> {
  const client = createSearchClient(env);
  const index = client.index(VIDEOS_INDEX);
  try {
    const doc = await index.getDocument(id);
    return doc as Video;
  } catch {
    return null;
  }
}

// キーワードで動画を検索
export async function searchVideos(env: Env, query: string, limit = 24): Promise<Video[]> {
  const client = createSearchClient(env);
  const index = client.index(VIDEOS_INDEX);
  const result = await index.search(query, {
    limit,
    sort: ['release_date:desc'],
  });
  return result.hits as Video[];
}

// 共通型を再エクスポート
export type { Video };
export type { Video as MeilisearchVideo };

// videosインデックスの設定（スクリプト用）
export const VIDEOS_INDEX_SETTINGS = {
  searchableAttributes: [
    'title',
    'actress',
    'description',
    'site_name',
    'provider_name',
  ],
  filterableAttributes: [
    'site_id',
    'site_name',
    'release_date',
    'actress',
    'provider_name',
  ],
  sortableAttributes: [
    'release_date',
  ],
  rankingRules: [
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
  ],
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
  localizedAttributes: [
    {
      locales: ['jpn'],
      attributePatterns: ['title', 'actress', 'description', 'site_name', 'provider_name'],
    },
  ],
  typoTolerance: {
    disableOnAttributes: ['title', 'actress', 'description', 'site_name', 'provider_name'],
  },
  pagination: {
    maxTotalHits: 5000,
  },
  faceting: {
    maxValuesPerFacet: 200,
  },
};

// バッチサイズ（Meilisearchへの一括投入時）
export const BATCH_SIZE = 1000;
