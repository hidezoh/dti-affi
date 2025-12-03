import Link from 'next/link';
import { Video } from '@/lib/db';

interface VideoCardProps {
    video: Video;
}

export default function VideoCard({ video }: VideoCardProps) {
    // Fallback for missing image: use a placeholder or try to derive from video URL
    // Since we don't have real images, we'll use a gradient placeholder or a generic icon if video preview isn't feasible efficiently here.
    // However, the plan mentioned trying to use the video as preview.
    // For the card, a video tag on hover is nice.

    return (
        <Link href={`/video/${video.id}`} className="group block">
            <div className="relative aspect-video bg-zinc-800 rounded-lg overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-2xl border border-zinc-700/50">
                {/* Video Preview on Hover (optional, might be heavy for many cards) */}
                {/* For now, let's use a placeholder with the title if no image is available */}
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-zinc-500">
                    <span className="text-4xl">▶</span>
                </div>

                {/* If we had an image: 
        <img src={video.image_url} alt={video.title} className="object-cover w-full h-full" />
        */}

                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />

                <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-mono text-white">
                    {video.release_date}
                </div>
            </div>

            <div className="mt-3">
                <h3 className="text-sm font-medium text-zinc-200 line-clamp-2 group-hover:text-white transition-colors">
                    {video.title}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">{video.actress}</p>
            </div>
        </Link>
    );
}
