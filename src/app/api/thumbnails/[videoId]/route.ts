import { NextRequest, NextResponse } from 'next/server';
import { 
  getThumbnailsByVideoId, 
  deleteThumbnail 
} from '@/lib/thumbnail-database';

// GET /api/thumbnails/[videoId] - 指定動画のサムネイル一覧取得
export async function GET(
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

    const thumbnails = getThumbnailsByVideoId(videoId);

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        thumbnails,
        count: thumbnails.length
      }
    });

  } catch (error) {
    console.error('サムネイル取得エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '不明なエラー' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/thumbnails/[videoId] - 指定動画の全サムネイル削除
export async function DELETE(
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

    // URLパラメータからthumbnailIdを取得
    const url = new URL(request.url);
    const thumbnailId = url.searchParams.get('thumbnailId');

    if (thumbnailId) {
      // 特定のサムネイルを削除
      deleteThumbnail(parseInt(thumbnailId));
      
      return NextResponse.json({
        success: true,
        message: `サムネイル ID ${thumbnailId} を削除しました`
      });
    } else {
      // 全サムネイル削除（実装は安全性を考慮して省略）
      return NextResponse.json(
        { error: '個別削除のみサポートされています。thumbnailIdパラメータを指定してください。' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('サムネイル削除エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '削除に失敗しました' 
      },
      { status: 500 }
    );
  }
}