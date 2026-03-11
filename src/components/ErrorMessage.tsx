interface ErrorMessageProps {
  message: string;
}

// 検索エラー時のフォールバックUI
export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div class="text-center py-20">
      <p class="text-4xl text-zinc-700 mb-4">⚠</p>
      <p class="text-zinc-400 mb-8">{message}</p>
      <a
        href="/"
        class="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
      >
        ホームに戻る
      </a>
    </div>
  );
}
