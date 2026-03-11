import type { Child } from "hono/jsx";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

// ページ番号リストを生成（現在ページ中心に前後2ページ + 最初/最後）
function buildPageNumbers(current: number, total: number): number[] {
  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let i = current - 2; i <= current + 2; i++) {
    if (i >= 1 && i <= total) {
      pages.add(i);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

// ページURLを構築
function buildPageUrl(baseUrl: string, page: number): string {
  if (page === 1) return baseUrl.split("?")[0] || "/";
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}page=${page}`;
}

// SSRリンクベースのページネーションコンポーネント
export function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
  if (totalPages <= 1) return <></>;

  const pages = buildPageNumbers(currentPage, totalPages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  // ページ番号間の省略記号を含むエレメントを構築
  const pageElements: Child[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) {
      pageElements.push(
        <span key={`ellipsis-${i}`} class="px-2 py-2 text-zinc-600">
          ...
        </span>,
      );
    }
    const p = pages[i];
    if (p === currentPage) {
      pageElements.push(
        <span
          key={p}
          class="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium"
        >
          {p}
        </span>,
      );
    } else {
      pageElements.push(
        <a
          key={p}
          href={buildPageUrl(baseUrl, p)}
          class="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
        >
          {p}
        </a>,
      );
    }
  }

  return (
    <nav class="flex justify-center items-center gap-2 mt-12" aria-label="ページネーション">
      {hasPrev ? (
        <a
          href={buildPageUrl(baseUrl, currentPage - 1)}
          class="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
        >
          ← 前へ
        </a>
      ) : (
        <span class="px-3 py-2 rounded-lg text-zinc-600 text-sm cursor-not-allowed">← 前へ</span>
      )}

      {pageElements}

      {hasNext ? (
        <a
          href={buildPageUrl(baseUrl, currentPage + 1)}
          class="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
        >
          次へ →
        </a>
      ) : (
        <span class="px-3 py-2 rounded-lg text-zinc-600 text-sm cursor-not-allowed">次へ →</span>
      )}
    </nav>
  );
}
