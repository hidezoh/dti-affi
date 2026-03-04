import { NextRequest, NextResponse } from 'next/server';
import { setPrimaryThumbnail, updateThumbnailCount } from '@/lib/thumbnail-database';

// PUT /api/thumbnails/[videoId]/primary/[thumbnailId] - プライマリサムネイル設定
export async function PUT(
  request: NextRequest,
  { params }: { params: { videoId: string; thumbnailId: string } }
) {
  try {
    const { videoId, thumbnailId } = params;

    if (!videoId || !thumbnailId) {
      return NextResponse.json(
        { error: 'Video ID and Thumbnail ID are required' },
        { status: 400 }
      );
    }

    const thumbnailIdNum = parseInt(thumbnailId);
    if (isNaN(thumbnailIdNum)) {
      return NextResponse.json(
        { error: 'Invalid Thumbnail ID' },
        { status: 400 }
      );
    }

    // プライマリサムネイルを設定
    setPrimaryThumbnail(videoId, thumbnailIdNum);
    
    // ad_materialsテーブルも更新
    updateThumbnailCount(videoId);

    return NextResponse.json({
      success: true,
      message: `サムネイル ${thumbnailId} をプライマリに設定しました`,
      data: {
        videoId,
        primaryThumbnailId: thumbnailIdNum
      }
    });

  } catch (error) {
    console.error('プライマリサムネイル設定エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '設定に失敗しました' 
      },
      { status: 500 }
    );
  }
}