/** エラーページコンポーネント */
export function ErrorPage({ statusCode, message }: { statusCode: number; message: string }) {
  return (
    <main class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <h1 class="text-6xl font-bold text-zinc-700 mb-4">{statusCode}</h1>
        <p class="text-zinc-400 mb-8">{message}</p>
        <a
          href="/"
          class="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
        >
          ホームに戻る
        </a>
      </div>
    </main>
  );
}
