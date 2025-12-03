import { getLatestVideos, searchVideos } from '@/lib/db';
import VideoCard from '@/components/VideoCard';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const revalidate = 0; // Dynamic for search

interface HomeProps {
    searchParams: { q?: string };
}

export default function Home({ searchParams }: HomeProps) {
    const query = searchParams.q;
    const videos = query ? searchVideos(query, 24) : getLatestVideos(24);

    async function searchAction(formData: FormData) {
        'use server';
        const q = formData.get('q');
        if (q) {
            redirect(`/?q=${encodeURIComponent(q.toString())}`);
        } else {
            redirect('/');
        }
    }

    return (
        <main className="min-h-screen p-8 max-w-7xl mx-auto">
            <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <Link href="/" className="block">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                            Velvet Lounge
                        </h1>
                        <p className="text-zinc-400 text-sm mt-1">厳選されたプレミアムコンテンツ</p>
                    </Link>
                </div>

                <form action={searchAction} className="w-full md:w-auto">
                    <input
                        name="q"
                        type="text"
                        placeholder="動画を検索..."
                        defaultValue={query}
                        className="w-full md:w-64 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white"
                    />
                </form>
            </header>

            <section>
                <h2 className="text-xl font-semibold mb-6 text-zinc-100 border-l-4 border-purple-500 pl-3">
                    {query ? `"${query}" の検索結果` : '新着動画'}
                </h2>

                {videos.length === 0 ? (
                    <div className="text-center py-20 text-zinc-500">
                        動画が見つかりませんでした。別のキーワードで検索してください。
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {videos.map((video) => (
                            <VideoCard key={video.id} video={video} />
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
