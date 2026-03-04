'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Thumbnail {
  id: number;
  video_id: string;
  site_id: string;
  thumbnail_type: 'zip_image' | 'video_frame' | 'screenshot' | 'manual';
  local_path: string;
  width: number;
  height: number;
  format: 'jpeg' | 'webp' | 'png';
  quality_score: number;
  is_primary: boolean;
}

interface ThumbnailPreviewProps {
  videoId: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
}

const sizeClasses = {
  small: 'w-24 h-16',
  medium: 'w-48 h-32',
  large: 'w-72 h-48'
};

export default function ThumbnailPreview({ 
  videoId, 
  className = '',
  size = 'medium',
  showDetails = false 
}: ThumbnailPreviewProps) {
  const [primaryThumbnail, setPrimaryThumbnail] = useState<Thumbnail | null>(null);
  const [allThumbnails, setAllThumbnails] = useState<Thumbnail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThumbnails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/thumbnails/${videoId}`);
      const data = await response.json();
      
      if (data.success) {
        const thumbnails = data.data.thumbnails;
        setAllThumbnails(thumbnails);
        
        // プライマリサムネイルを見つける
        const primary = thumbnails.find((t: Thumbnail) => t.is_primary);
        setPrimaryThumbnail(primary || thumbnails[0] || null);
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

  useEffect(() => {
    if (videoId) {
      fetchThumbnails();
    }
  }, [videoId]); // fetchThumbnailsは内部関数なので依存配列に含めない

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-200 animate-pulse rounded ${className}`}>
        <div className="w-full h-full bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (error || !primaryThumbnail) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500 text-sm">
          <div className="mb-1">📷</div>
          <div>サムネイル未生成</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} relative group`}>
      {/* メインサムネイル */}
      <div className={`${sizeClasses[size]} relative overflow-hidden rounded shadow-sm`}>
        <Image
          src={`/${primaryThumbnail.local_path}`}
          alt={`Video ${videoId} thumbnail`}
          fill
          className="object-cover"
          sizes={
            size === 'small' ? '96px' :
            size === 'medium' ? '192px' : '288px'
          }
        />
        
        {/* 品質バッジ */}
        <div className="absolute top-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1.5 py-0.5 rounded">
          {primaryThumbnail.quality_score}/10
        </div>

        {/* 形式バッジ */}
        <div className="absolute bottom-1 right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded uppercase">
          {primaryThumbnail.format}
        </div>
      </div>

      {/* 詳細情報（オプション） */}
      {showDetails && (
        <div className="mt-2 text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>サイズ:</span>
            <span>{primaryThumbnail.width}×{primaryThumbnail.height}</span>
          </div>
          <div className="flex justify-between">
            <span>種類:</span>
            <span>
              {primaryThumbnail.thumbnail_type === 'zip_image' ? 'ZIP画像' :
               primaryThumbnail.thumbnail_type === 'video_frame' ? '動画フレーム' :
               primaryThumbnail.thumbnail_type === 'screenshot' ? 'スクリーンショット' : 'カスタム'}
            </span>
          </div>
          {allThumbnails.length > 1 && (
            <div className="flex justify-between">
              <span>代替:</span>
              <span>{allThumbnails.length - 1}個</span>
            </div>
          )}
        </div>
      )}

      {/* ホバーツールチップ（代替サムネイル一覧） */}
      {allThumbnails.length > 1 && (
        <div className="absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
          <div className="absolute top-full left-0 mt-2 p-2 bg-white border border-gray-200 rounded-md shadow-lg min-w-max">
            <div className="text-xs text-gray-700 mb-2">代替サムネイル:</div>
            <div className="grid grid-cols-2 gap-2">
              {allThumbnails
                .filter(t => t.id !== primaryThumbnail.id)
                .slice(0, 4)
                .map((thumbnail) => (
                  <div key={thumbnail.id} className="relative w-16 h-10 bg-gray-100 rounded overflow-hidden">
                    <Image
                      src={`/${thumbnail.local_path}`}
                      alt={`Alternative thumbnail ${thumbnail.id}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                    <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-[10px] px-1 py-0.5">
                      {thumbnail.quality_score}
                    </div>
                  </div>
                ))}
            </div>
            {allThumbnails.length > 5 && (
              <div className="text-xs text-gray-500 mt-1 text-center">
                +{allThumbnails.length - 5}個
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}