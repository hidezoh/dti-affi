// Cloudflare Workers環境変数の型定義
export interface Env {
  MEILISEARCH_HOST: string;
  MEILISEARCH_SEARCH_API_KEY: string;
  MEILISEARCH_ADMIN_API_KEY?: string;
  // D1バインディング（将来用）
  // DB: D1Database;
  // KVバインディング（将来用）
  // KV: KVNamespace;
}
