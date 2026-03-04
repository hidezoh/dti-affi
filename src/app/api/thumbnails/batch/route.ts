import { NextRequest, NextResponse } from 'next/server';
import { batchGenerateThumbnails } from '@/lib/thumbnail-generator';
import { batchGenerateVideoFrameThumbnails } from '@/lib/video-frame-extractor';
import { AD_SITES } from '@/lib/ad-materials';
import { EMBED_SITES } from '@/lib/video-frame-extractor';

interface BatchRequest {
  videos: {
    videoId: string;
    siteId: string;
    imageDirectory?: string;
  }[];
  options?: {
    quality?: number;
    generateWebP?: boolean;
    timeout?: number;
  };
  mode?: 'mixed' | 'zip_only' | 'video_only';
}

// POST /api/thumbnails/batch - バッチサムネイル生成
export async function POST(request: NextRequest) {
  try {
    const body: BatchRequest = await request.json();
    const { videos, options = {}, mode = 'mixed' } = body;

    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json(
        { error: 'Videos array is required and must not be empty' },
        { status: 400 }
      );
    }

    // 最大処理件数の制限
    if (videos.length > 100) {
      return NextResponse.json(
        { error: '一度に処理できる動画は100件までです' },
        { status: 400 }
      );
    }

    // サイトIDの検証
    for (const video of videos) {
      if (!video.videoId || !video.siteId) {
        return NextResponse.json(
          { error: 'All videos must have videoId and siteId' },
          { status: 400 }
        );
      }

      const isZipSite = AD_SITES.some(site => site.id === video.siteId);
      const isEmbedSite = EMBED_SITES.some(site => site.id === video.siteId);

      if (!isZipSite && !isEmbedSite) {
        return NextResponse.json(
          { error: `サポートされていないサイト: ${video.siteId}` },
          { status: 400 }
        );
      }
    }

    const zipVideos: { videoId: string; siteId: string; imageDirectory: string }[] = [];
    const embedVideos: { videoId: string; siteId: string }[] = [];

    // モードに応じて動画を分類
    for (const video of videos) {
      const isZipSite = AD_SITES.some(site => site.id === video.siteId);
      
      if (mode === 'zip_only' && !isZipSite) continue;
      if (mode === 'video_only' && isZipSite) continue;

      if (isZipSite) {
        // ZIP画像対応サイト
        let imageDirectory = video.imageDirectory;
        
        if (!imageDirectory) {
          // デフォルトディレクトリを推測
          const siteConfig = AD_SITES.find(site => site.id === video.siteId);
          imageDirectory = `public/images/ad-materials/${siteConfig!.siteName}/${video.videoId}`;
        }

        zipVideos.push({
          videoId: video.videoId,
          siteId: video.siteId,
          imageDirectory
        });
      } else {
        // 埋め込みコード専用サイト
        embedVideos.push({
          videoId: video.videoId,
          siteId: video.siteId
        });
      }
    }

    console.log(`バッチ処理開始: ZIP(${zipVideos.length}件), 動画(${embedVideos.length}件)`);

    const results = {
      zipResults: null as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      videoResults: null as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      totalSuccess: 0,
      totalFailed: 0,
      totalProcessed: 0
    };

    // ZIP画像からのサムネイル生成
    if (zipVideos.length > 0) {
      console.log(`ZIP画像サムネイル生成開始: ${zipVideos.length}件`);
      results.zipResults = await batchGenerateThumbnails(zipVideos, options);
      results.totalSuccess += results.zipResults.success;
      results.totalFailed += results.zipResults.failed;
      results.totalProcessed += zipVideos.length;
    }

    // 動画フレームからのサムネイル生成
    if (embedVideos.length > 0) {
      console.log(`動画フレームサムネイル生成開始: ${embedVideos.length}件`);
      results.videoResults = await batchGenerateVideoFrameThumbnails(embedVideos, options);
      results.totalSuccess += results.videoResults.success;
      results.totalFailed += results.videoResults.failed;
      results.totalProcessed += embedVideos.length;
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: results.totalProcessed,
        totalSuccess: results.totalSuccess,
        totalFailed: results.totalFailed,
        successRate: results.totalProcessed > 0 
          ? Math.round((results.totalSuccess / results.totalProcessed) * 100) 
          : 0
      },
      details: {
        zipProcessed: zipVideos.length,
        zipSuccess: results.zipResults?.success || 0,
        zipFailed: results.zipResults?.failed || 0,
        videoProcessed: embedVideos.length,
        videoSuccess: results.videoResults?.success || 0,
        videoFailed: results.videoResults?.failed || 0
      },
      results: {
        zipResults: results.zipResults?.results || [],
        videoResults: results.videoResults?.results || []
      }
    });

  } catch (error) {
    console.error('バッチサムネイル生成エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '不明なエラー' 
      },
      { status: 500 }
    );
  }
}