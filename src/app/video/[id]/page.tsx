import { getVideoById } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
    params: {
        id: string;
    };
}

export default function VideoPage({ params }: PageProps) {
    const video = getVideoById(params.id);

    if (!video) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-black text-white">
            {/* Navigation */}
            <nav className="p-4 border-b border-zinc-800">
                <div className="max-w-7xl mx-auto flex items-center">
                    <Link href="/" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
                        ← ホームに戻る
                    </Link>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto p-4 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Video Player */}
                        <div className="aspect-video bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
                            {video.sample_movie_url_2 ? (
                                <video
                                    controls
                                    poster={video.sample_url /* Fallback if sample_url is image, but it's likely page url. */}
                                    className="w-full h-full"
                                    src={video.sample_movie_url_2}
                                >
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                    プレビュー利用不可
                                </div>
                            )}
                        </div>

                        {/* Title & Info */}
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{video.title}</h1>
                            <div className="flex flex-wrap gap-4 text-sm text-zinc-400 mb-4">
                                <span className="bg-zinc-800 px-2 py-1 rounded">{video.release_date}</span>
                                <span className="text-purple-400 font-medium">{video.actress}</span>
                                <span>{video.site_name}</span>
                            </div>
                            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                {video.description}
                            </p>
                        </div>
                    </div>

                    {/* Sidebar / CTA */}
                    <div className="lg:col-span-1">
                        <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 sticky top-8">
                            <h3 className="text-lg font-semibold mb-4 text-white">フル動画を視聴する</h3>
                            <p className="text-sm text-zinc-400 mb-6">
                                公式サイトで高画質・完全版をお楽しみください。
                            </p>

                            <a
                                href={video.aff_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-center font-bold py-4 rounded-lg shadow-lg hover:shadow-purple-500/25 transition-all transform hover:-translate-y-0.5"
                            >
                                今すぐ見る
                                <span className="ml-2">→</span>
                            </a>

                            <div className="mt-6 pt-6 border-t border-zinc-800 text-xs text-zinc-500 text-center">
                                ID: {video.id} • 提供: {video.provider_name || 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
