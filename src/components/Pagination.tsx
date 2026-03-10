/** ページネーションUIコンポーネント（SSRリンクベース） */
export function Pagination({
  currentPage,
  totalPages,
  query,
}: {
  currentPage: number;
  totalPages: number;
  query?: string;
}) {
  const buildUrl = (page: number): string => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("page", String(page));
    return `/?${params.toString()}`;
  };

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav class="flex items-center justify-center gap-4 mt-12 mb-8" aria-label="ページネーション">
      {hasPrev ? (
        <a
          href={buildUrl(currentPage - 1)}
          class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors"
        >
          ← 前のページ
        </a>
      ) : (
        <span class="px-4 py-2 bg-zinc-900 text-zinc-600 rounded-lg cursor-not-allowed">
          ← 前のページ
        </span>
      )}

      <span class="text-zinc-400 text-sm tabular-nums">
        {currentPage} / {totalPages}
      </span>

      {hasNext ? (
        <a
          href={buildUrl(currentPage + 1)}
          class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors"
        >
          次のページ →
        </a>
      ) : (
        <span class="px-4 py-2 bg-zinc-900 text-zinc-600 rounded-lg cursor-not-allowed">
          次のページ →
        </span>
      )}
    </nav>
  );
}
