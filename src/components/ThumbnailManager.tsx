'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Thumbnail {
  id: number;
  video_id: string;
  site_id: string;
  thumbnail_type: 'zip_image' | 'video_frame' | 'screenshot' | 'manual';
  original_url?: string;
  local_path: string;
  width: number;
  height: number;
  file_size?: number;
  format: 'jpeg' | 'webp' | 'png';
  quality_score: number;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ThumbnailManagerProps {
  videoId: string;
  siteId: string;
}

export default function ThumbnailManager({ videoId, siteId }: ThumbnailManagerProps) {
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // サムネイル一覧を取得
  const fetchThumbnails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/thumbnails/${videoId}`);
      const data = await response.json();
      
      if (data.success) {
        setThumbnails(data.data.thumbnails);
      } else {
        setError(data.error || 'サムネイルの取得に失敗しました');
      }
    } catch (err) {
      setError('サムネイルの取得中にエラーが発生しました');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // サムネイル生成
  const generateThumbnail = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      const response = await fetch(`/api/thumbnails/${videoId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId,
          method: 'auto',
          options: {
            quality: 85,
            generateWebP: true
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchThumbnails(); // リロード
      } else {
        setError(data.error || 'サムネイルの生成に失敗しました');
      }
    } catch (err) {
      setError('サムネイル生成中にエラーが発生しました');
      console.error('Generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  // プライマリサムネイルを設定
  const setPrimary = async (thumbnailId: number) => {
    try {
      const response = await fetch(`/api/thumbnails/${videoId}/primary/${thumbnailId}`, {
        method: 'PUT',
      });

      const data = await response.json();

      if (data.success) {
        await fetchThumbnails(); // リロード
      } else {
        setError(data.error || 'プライマリ設定に失敗しました');
      }
    } catch (err) {
      setError('プライマリ設定中にエラーが発生しました');
      console.error('Set primary error:', err);
    }
  };

  // サムネイル削除
  const deleteThumbnail = async (thumbnailId: number) => {
    if (!confirm('このサムネイルを削除しますか？')) return;

    try {
      const response = await fetch(`/api/thumbnails/${videoId}?thumbnailId=${thumbnailId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await fetchThumbnails(); // リロード
      } else {
        setError(data.error || '削除に失敗しました');
      }
    } catch (err) {
      setError('削除中にエラーが発生しました');
      console.error('Delete error:', err);
    }
  };

  useEffect(() => {
    fetchThumbnails();
  }, [videoId]); // fetchThumbnailsは内部関数なので依存配列に含めない

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          サムネイル管理
        </h3>
        <button
          onClick={generateThumbnail}
          disabled={generating}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? '生成中...' : 'サムネイル生成'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {thumbnails.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">
            サムネイルがまだ生成されていません
          </div>
          <button
            onClick={generateThumbnail}
            disabled={generating}
            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {generating ? '生成中...' : '今すぐ生成する'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            {thumbnails.length}個のサムネイルが利用可能
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {thumbnails.map((thumbnail) => (
              <div
                key={thumbnail.id}
                className={`border rounded-lg p-4 ${
                  thumbnail.is_primary ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {/* サムネイル画像 */}
                <div className="relative aspect-video mb-3 bg-gray-100 rounded overflow-hidden">
                  <Image
                    src={`/${thumbnail.local_path}`}
                    alt={`Thumbnail ${thumbnail.id}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  {thumbnail.is_primary && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                      プライマリ
                    </div>
                  )}
                </div>

                {/* サムネイル情報 */}
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">形式:</span>
                    <span className="uppercase">{thumbnail.format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">サイズ:</span>
                    <span>{thumbnail.width}×{thumbnail.height}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">品質:</span>
                    <span>{thumbnail.quality_score}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">種類:</span>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                      {thumbnail.thumbnail_type === 'zip_image' ? 'ZIP画像' :
                       thumbnail.thumbnail_type === 'video_frame' ? '動画フレーム' :
                       thumbnail.thumbnail_type === 'screenshot' ? 'スクリーンショット' : 'カスタム'}
                    </span>
                  </div>
                  {thumbnail.file_size && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">容量:</span>
                      <span>{Math.round(thumbnail.file_size / 1024)}KB</span>
                    </div>
                  )}
                </div>

                {/* アクション */}
                <div className="mt-4 flex space-x-2">
                  {!thumbnail.is_primary && (
                    <button
                      onClick={() => setPrimary(thumbnail.id)}
                      className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      プライマリに設定
                    </button>
                  )}
                  <button
                    onClick={() => deleteThumbnail(thumbnail.id)}
                    className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}