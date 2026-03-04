import { NextRequest, NextResponse } from 'next/server';
import { generateThumbnailFromZipImages } from '@/lib/thumbnail-generator';
import { generateThumbnailFromVideoFrame } from '@/lib/video-frame-extractor';
import { AD_SITES } from '@/lib/ad-materials';
import { EMBED_SITES } from '@/lib/video-frame-extractor';
import path from 'path';
import fs from 'fs';

interface GenerateRequest {
  siteId: string;
  method?: 'auto' | 'zip' | 'video_frame';
  imageDirectory?: string;
  options?: {
    quality?: number;
    generateWebP?: boolean;
    timeout?: number;
  };
}

// POST /api/thumbnails/[videoId]/generate - サムネイル自動生成
export async function POST(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    const body: GenerateRequest = await request.json();
    const { siteId, method = 'auto', imageDirectory, options = {} } = body;

    if (!siteId) {
      return NextResponse.json(
        { error: 'Site ID is required' },
        { status: 400 }
      );
    }

    // サイト別の処理方法を決定
    const isZipSite = AD_SITES.some(site => site.id === siteId);
    const isEmbedSite = EMBED_SITES.some(site => site.id === siteId);

    if (!isZipSite && !isEmbedSite) {
      return NextResponse.json(
        { error: `サポートされていないサイト: ${siteId}` },
        { status: 400 }
      );
    }

    let result;

    // 処理方法に応じて実行
    if (method === 'auto') {
      if (isZipSite) {
        // ZIP画像からサムネイル生成
        if (!imageDirectory) {
          // デフォルトの画像ディレクトリを推測
          const siteConfig = AD_SITES.find(site => site.id === siteId);
          const defaultImageDir = path.join(
            process.cwd(), 
            'public/images/ad-materials', 
            siteConfig!.siteName, 
            videoId
          );
          
          if (!fs.existsSync(defaultImageDir)) {
            return NextResponse.json(
              { 
                error: '画像ディレクトリが見つかりません。先に広告素材をダウンロードしてください。',
                suggestedPath: defaultImageDir
              },
              { status: 404 }
            );
          }
          
          result = await generateThumbnailFromZipImages(
            videoId, 
            siteId, 
            defaultImageDir, 
            options
          );
        } else {
          result = await generateThumbnailFromZipImages(
            videoId, 
            siteId, 
            imageDirectory, 
            options
          );
        }
      } else {
        // 動画フレームからサムネイル生成
        result = await generateThumbnailFromVideoFrame(
          videoId, 
          siteId, 
          options
        );
      }
    } else if (method === 'zip') {
      if (!isZipSite) {
        return NextResponse.json(
          { error: 'このサイトはZIP画像に対応していません' },
          { status: 400 }
        );
      }
      
      if (!imageDirectory) {
        return NextResponse.json(
          { error: 'ZIP方式では画像ディレクトリの指定が必要です' },
          { status: 400 }
        );
      }

      result = await generateThumbnailFromZipImages(
        videoId, 
        siteId, 
        imageDirectory, 
        options
      );
    } else if (method === 'video_frame') {
      if (!isEmbedSite) {
        return NextResponse.json(
          { error: 'このサイトは動画フレーム抽出に対応していません' },
          { status: 400 }
        );
      }

      result = await generateThumbnailFromVideoFrame(
        videoId, 
        siteId, 
        options
      );
    } else {
      return NextResponse.json(
        { error: '無効な生成方法です。auto, zip, video_frameから選択してください' },
        { status: 400 }
      );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          videoId,
          siteId,
          method: isZipSite ? 'zip_image' : 'video_frame',
          thumbnails: result.thumbnails,
          count: result.thumbnails?.length || 0
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || '生成に失敗しました' 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('サムネイル生成エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '不明なエラー' 
      },
      { status: 500 }
    );
  }
}