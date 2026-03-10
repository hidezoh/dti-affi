import type { Video } from "../types/video.js";

interface VideoCardProps {
  video: Video;
}

// 動画カードコンポーネント（hono/jsx版）
export function VideoCard({ video }: VideoCardProps) {
  return (
    <a href={`/video/${video.id}`} class="group block">
      <div class="relative aspect-video bg-zinc-800 rounded-lg overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-2xl border border-zinc-700/50">
        <div class="absolute inset-0 flex items-center justify-center bg-zinc-900 text-zinc-500">
          <span class="text-4xl">▶</span>
        </div>

        <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />

        <div class="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-mono text-white">
          {video.release_date}
        </div>
      </div>

      <div class="mt-3">
        <h3 class="text-sm font-medium text-zinc-200 line-clamp-2 group-hover:text-white transition-colors">
          {video.title}
        </h3>
        <p class="text-xs text-zinc-400 mt-1">{video.actress}</p>
      </div>
    </a>
  );
}
