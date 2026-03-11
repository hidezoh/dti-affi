import { Hono } from "hono";
import { ErrorMessage } from "./components/ErrorMessage.js";
import { Layout } from "./components/Layout.js";
import { Pagination } from "./components/Pagination.js";
import { VideoCard } from "./components/VideoCard.js";
import { getLatestVideos, getVideoById, searchVideos } from "./lib/meilisearch.js";
import type { Env } from "./types/env.js";

const app = new Hono<{ Bindings: Env }>();

// ページ番号をパースしバリデーション
function parsePage(raw: string | undefined): number {
  if (!raw) return 1;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1) return 1;
  return n;
}

// トップページ（新着 or 検索結果）
app.get("/", async (c) => {
  const query = c.req.query("q");
  const page = parsePage(c.req.query("page"));

  try {
    const result = query
      ? await searchVideos(c.env, query, page)
      : await getLatestVideos(c.env, page);

    // ページ範囲超過時は1ページ目にリダイレクト
    if (page > result.totalPages && result.totalPages > 0) {
      const redirectUrl = query ? `/?q=${encodeURIComponent(query)}` : "/";
      return c.redirect(redirectUrl);
    }

    const baseUrl = query ? `/?q=${encodeURIComponent(query)}` : "/";

    return c.html(
      <Layout>
        <main class="min-h-screen p-8 max-w-7xl mx-auto">
          <header class="mb-12 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <a href="/" class="block">
                <h1 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                  Velvet Lounge
                </h1>
                <p class="text-zinc-400 text-sm mt-1">厳選されたプレミアムコンテンツ</p>
              </a>
            </div>

            <form method="get" action="/" class="w-full md:w-auto">
              <input
                name="q"
                type="text"
                placeholder="動画を検索..."
                value={query || ""}
                class="w-full md:w-64 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white"
              />
            </form>
          </header>

          <section>
            <h2 class="text-xl font-semibold mb-6 text-zinc-100 border-l-4 border-purple-500 pl-3">
              {query ? `"${query}" の検索結果` : "新着動画"}
              {result.totalHits > 0 && (
                <span class="text-sm font-normal text-zinc-400 ml-2">({result.totalHits}件)</span>
              )}
            </h2>

            {result.hits.length === 0 ? (
              <div class="text-center py-20 text-zinc-500">
                動画が見つかりませんでした。別のキーワードで検索してください。
              </div>
            ) : (
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {result.hits.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            )}

            <Pagination
              currentPage={result.page}
              totalPages={result.totalPages}
              baseUrl={baseUrl}
            />
          </section>
        </main>
      </Layout>,
    );
  } catch (error) {
    console.error("検索処理でエラー発生:", error);
    return c.html(
      <Layout>
        <main class="min-h-screen p-8 max-w-7xl mx-auto">
          <header class="mb-12">
            <a href="/" class="block">
              <h1 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                Velvet Lounge
              </h1>
              <p class="text-zinc-400 text-sm mt-1">厳選されたプレミアムコンテンツ</p>
            </a>
          </header>
          <ErrorMessage message="動画の取得中にエラーが発生しました。しばらくしてからもう一度お試しください。" />
        </main>
      </Layout>,
    );
  }
});

// 動画詳細ページ
app.get("/video/:id", async (c) => {
  const id = c.req.param("id");
  const video = await getVideoById(c.env, id);

  if (!video) {
    return c.notFound();
  }

  const pageTitle = `${video.title} - Velvet Lounge`;
  const pageDescription = video.description || `${video.title} - ${video.actress}`;

  return c.html(
    <Layout title={pageTitle} description={pageDescription}>
      <main class="min-h-screen bg-black text-white">
        {/* ナビゲーション */}
        <nav class="p-4 border-b border-zinc-800">
          <div class="max-w-7xl mx-auto flex items-center">
            <a
              href="/"
              class="text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
            >
              ← ホームに戻る
            </a>
          </div>
        </nav>

        <div class="max-w-6xl mx-auto p-4 md:p-8">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* メインコンテンツ */}
            <div class="lg:col-span-2 space-y-6">
              {/* ビデオプレイヤー */}
              <div class="aspect-video bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
                {video.sample_movie_url_2 ? (
                  <video controls class="w-full h-full" src={video.sample_movie_url_2}>
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div class="w-full h-full flex items-center justify-center text-zinc-500">
                    プレビュー利用不可
                  </div>
                )}
              </div>

              {/* タイトル・情報 */}
              <div>
                <h1 class="text-2xl md:text-3xl font-bold text-white mb-2">{video.title}</h1>
                <div class="flex flex-wrap gap-4 text-sm text-zinc-400 mb-4">
                  <span class="bg-zinc-800 px-2 py-1 rounded">{video.release_date}</span>
                  <span class="text-purple-400 font-medium">{video.actress}</span>
                  <span>{video.site_name}</span>
                </div>
                <p class="text-zinc-300 leading-relaxed whitespace-pre-wrap">{video.description}</p>
              </div>
            </div>

            {/* サイドバー / CTA */}
            <div class="lg:col-span-1">
              <div class="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 sticky top-8">
                <h3 class="text-lg font-semibold mb-4 text-white">フル動画を視聴する</h3>
                <p class="text-sm text-zinc-400 mb-6">
                  公式サイトで高画質・完全版をお楽しみください。
                </p>

                <a
                  href={video.aff_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-center font-bold py-4 rounded-lg shadow-lg hover:shadow-purple-500/25 transition-all transform hover:-translate-y-0.5"
                >
                  今すぐ見る
                  <span class="ml-2">→</span>
                </a>

                <div class="mt-6 pt-6 border-t border-zinc-800 text-xs text-zinc-500 text-center">
                  ID: {video.id} • 提供: {video.provider_name || "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>,
  );
});

// 404ページ
app.notFound((c) => {
  return c.html(
    <Layout title="ページが見つかりません - Velvet Lounge">
      <main class="min-h-screen flex items-center justify-center">
        <div class="text-center">
          <h1 class="text-6xl font-bold text-zinc-700 mb-4">404</h1>
          <p class="text-zinc-400 mb-8">ページが見つかりませんでした</p>
          <a
            href="/"
            class="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            ホームに戻る
          </a>
        </div>
      </main>
    </Layout>,
  );
});

// グローバルエラーハンドラ
app.onError((err, c) => {
  console.error("サーバーエラー:", err);
  return c.html(
    <Layout title="エラー - Velvet Lounge">
      <main class="min-h-screen flex items-center justify-center">
        <div class="text-center">
          <h1 class="text-6xl font-bold text-zinc-700 mb-4">500</h1>
          <p class="text-zinc-400 mb-8">サーバーエラーが発生しました</p>
          <a
            href="/"
            class="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            ホームに戻る
          </a>
        </div>
      </main>
    </Layout>,
    500,
  );
});

export default app;
