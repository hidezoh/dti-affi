// アフィリエイトリンクのURL安全性検証ユーティリティ

/** 許可ドメインリスト */
const ALLOWED_DOMAINS = [
  "al.dmm.co.jp",
  "www.dmm.co.jp",
  "www.dmm.com",
];

/**
 * URLが安全なアフィリエイトリンクかどうかを検証する
 * - httpsスキームのみ許可
 * - 許可ドメインリストに含まれるドメインのみ許可
 */
export function isValidAffiliateUrl(url: string): boolean {
  if (!url) return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;

  return ALLOWED_DOMAINS.includes(parsed.hostname);
}

/**
 * 安全なURLの場合はそのまま返し、不正な場合はnullを返す
 */
export function sanitizeAffiliateUrl(url: string): string | null {
  return isValidAffiliateUrl(url) ? url : null;
}
