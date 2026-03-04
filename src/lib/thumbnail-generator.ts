import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import sizeOf from 'image-size';
import { 
  Thumbnail, 
  saveThumbnail, 
  updateThumbnailCount,
  createThumbnailsTable 
} from './thumbnail-database';

// サムネイル標準サイズ
export const THUMBNAIL_CONFIG = {
  width: 300,
  height: 200,
  quality: 85,
  formats: ['jpeg', 'webp'] as const
};

export interface ThumbnailGenerationResult {
  success: boolean;
  thumbnails?: Thumbnail[];
  error?: string;
}

export interface GenerationOptions {
  outputDir?: string;
  preferredFormat?: 'jpeg' | 'webp';
  quality?: number;
  generateWebP?: boolean;
}

/**
 * ZIP内画像からサムネイルを生成する
 */
export async function generateThumbnailFromZipImages(
  videoId: string,
  siteId: string,
  imageDirectory: string,
  options: GenerationOptions = {}
): Promise<ThumbnailGenerationResult> {
  try {
    // データベーステーブルを初期化
    createThumbnailsTable();
    
    const {
      outputDir = 'public/images/thumbnails',
      quality = THUMBNAIL_CONFIG.quality,
      generateWebP = true
    } = options;

    if (!fs.existsSync(imageDirectory)) {
      return { success: false, error: '画像ディレクトリが見つかりません' };
    }

    // 画像ファイルを取得
    const imageFiles = fs.readdirSync(imageDirectory)
      .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));

    if (imageFiles.length === 0) {
      return { success: false, error: '画像ファイルが見つかりません' };
    }

    // 最適な画像を選択（品質評価）
    const bestImage = await selectBestImageForThumbnail(imageDirectory, imageFiles);
    if (!bestImage) {
      return { success: false, error: '適切な画像が見つかりませんでした' };
    }

    const sourcePath = path.join(imageDirectory, bestImage.fileName);
    const thumbnails: Thumbnail[] = [];

    // 出力ディレクトリ作成
    const outputPath = path.join(process.cwd(), outputDir, siteId, videoId);
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // JPEG サムネイル生成
    const jpegFileName = `thumbnail.jpg`;
    const jpegOutputPath = path.join(outputPath, jpegFileName);
    
    const jpegBuffer = await sharp(sourcePath)
      .resize(THUMBNAIL_CONFIG.width, THUMBNAIL_CONFIG.height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality, progressive: true })
      .toBuffer();

    fs.writeFileSync(jpegOutputPath, jpegBuffer);

    const jpegThumbnail: Omit<Thumbnail, 'id' | 'created_at' | 'updated_at'> = {
      video_id: videoId,
      site_id: siteId,
      thumbnail_type: 'zip_image',
      local_path: path.relative(process.cwd(), jpegOutputPath),
      width: THUMBNAIL_CONFIG.width,
      height: THUMBNAIL_CONFIG.height,
      file_size: jpegBuffer.length,
      format: 'jpeg',
      quality_score: bestImage.qualityScore,
      is_primary: true
    };

    const jpegId = saveThumbnail(jpegThumbnail);
    thumbnails.push({ ...jpegThumbnail, id: jpegId });

    // WebP サムネイル生成（オプション）
    if (generateWebP) {
      const webpFileName = `thumbnail.webp`;
      const webpOutputPath = path.join(outputPath, webpFileName);
      
      const webpBuffer = await sharp(sourcePath)
        .resize(THUMBNAIL_CONFIG.width, THUMBNAIL_CONFIG.height, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: quality + 5 }) // WebPは同品質でファイルサイズが小さいため
        .toBuffer();

      fs.writeFileSync(webpOutputPath, webpBuffer);

      const webpThumbnail: Omit<Thumbnail, 'id' | 'created_at' | 'updated_at'> = {
        video_id: videoId,
        site_id: siteId,
        thumbnail_type: 'zip_image',
        local_path: path.relative(process.cwd(), webpOutputPath),
        width: THUMBNAIL_CONFIG.width,
        height: THUMBNAIL_CONFIG.height,
        file_size: webpBuffer.length,
        format: 'webp',
        quality_score: bestImage.qualityScore,
        is_primary: false // JPEGをプライマリとする
      };

      const webpId = saveThumbnail(webpThumbnail);
      thumbnails.push({ ...webpThumbnail, id: webpId });
    }

    // ad_materialsテーブルを更新
    updateThumbnailCount(videoId);

    return { success: true, thumbnails };

  } catch (error) {
    console.error('サムネイル生成エラー:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '不明なエラー' 
    };
  }
}

/**
 * 最適な画像を選択する（品質評価）
 */
async function selectBestImageForThumbnail(
  imageDirectory: string, 
  imageFiles: string[]
): Promise<{ fileName: string; qualityScore: number } | null> {
  const candidates: { fileName: string; qualityScore: number }[] = [];

  for (const fileName of imageFiles) {
    const filePath = path.join(imageDirectory, fileName);
    
    try {
      // ファイルサイズチェック
      const stats = fs.statSync(filePath);
      if (stats.size < 10000) continue; // 10KB未満は除外

      // 画像サイズ取得
      const dimensions = sizeOf(filePath);
      if (!dimensions.width || !dimensions.height) continue;

      // 品質スコア計算
      const qualityScore = calculateImageQualityScore(
        dimensions.width,
        dimensions.height,
        stats.size,
        fileName
      );

      candidates.push({ fileName, qualityScore });
      
    } catch (error) {
      console.warn(`画像評価エラー: ${fileName}`, error);
    }
  }

  // 最高スコアの画像を選択
  candidates.sort((a, b) => b.qualityScore - a.qualityScore);
  return candidates[0] || null;
}

/**
 * 画像品質スコアを計算する（1-10点）
 */
function calculateImageQualityScore(
  width: number,
  height: number,
  fileSize: number,
  fileName: string
): number {
  let score = 5; // ベーススコア

  // 解像度スコア
  const resolution = width * height;
  if (resolution >= 1920 * 1080) score += 2;
  else if (resolution >= 1280 * 720) score += 1.5;
  else if (resolution >= 640 * 480) score += 1;
  else score -= 1;

  // アスペクト比スコア（16:9や4:3を優遇）
  const aspectRatio = width / height;
  if (Math.abs(aspectRatio - 16/9) < 0.1) score += 1;
  else if (Math.abs(aspectRatio - 4/3) < 0.1) score += 0.5;
  else if (aspectRatio < 0.7 || aspectRatio > 2.0) score -= 1; // 極端なアスペクト比は減点

  // ファイルサイズスコア（適度な圧縮バランス）
  const bytesPerPixel = fileSize / resolution;
  if (bytesPerPixel > 0.5 && bytesPerPixel < 2.0) score += 1;
  else if (bytesPerPixel < 0.2) score -= 1; // 過度に圧縮された画像

  // ファイル名による推測（thumbnailやcoverなどが含まれる場合）
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.includes('thumb') || lowerFileName.includes('cover')) {
    score += 0.5;
  }
  if (lowerFileName.includes('small') || lowerFileName.includes('mini')) {
    score -= 0.5;
  }

  // スコアを1-10の範囲に制限
  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

/**
 * 複数動画の一括サムネイル生成
 */
export async function batchGenerateThumbnails(
  videos: { videoId: string; siteId: string; imageDirectory: string }[],
  options: GenerationOptions = {}
): Promise<{
  success: number;
  failed: number;
  results: { videoId: string; success: boolean; error?: string }[];
}> {
  const results: { videoId: string; success: boolean; error?: string }[] = [];
  let success = 0;
  let failed = 0;

  for (const video of videos) {
    try {
      console.log(`サムネイル生成中: ${video.videoId} (${video.siteId})`);
      
      const result = await generateThumbnailFromZipImages(
        video.videoId,
        video.siteId,
        video.imageDirectory,
        options
      );

      if (result.success) {
        success++;
        results.push({ videoId: video.videoId, success: true });
        console.log(`✓ 完了: ${video.videoId}`);
      } else {
        failed++;
        results.push({ 
          videoId: video.videoId, 
          success: false, 
          error: result.error 
        });
        console.error(`✗ 失敗: ${video.videoId} - ${result.error}`);
      }

      // 処理負荷軽減のため少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      results.push({ 
        videoId: video.videoId, 
        success: false, 
        error: errorMessage 
      });
      console.error(`✗ 例外: ${video.videoId} - ${errorMessage}`);
    }
  }

  return { success, failed, results };
}