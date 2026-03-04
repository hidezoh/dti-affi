import puppeteer from 'puppeteer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { 
  Thumbnail, 
  saveThumbnail, 
  updateThumbnailCount 
} from './thumbnail-database';
import { THUMBNAIL_CONFIG } from './thumbnail-generator';

export interface VideoFrameExtractionOptions {
  outputDir?: string;
  timeout?: number;
  quality?: number;
  generateWebP?: boolean;
  waitForVideo?: number;
  screenshotDelay?: number;
}

export interface FrameExtractionResult {
  success: boolean;
  thumbnails?: Thumbnail[];
  error?: string;
}

// 埋め込みコード専用サイトの設定
export const EMBED_SITES = [
  {
    id: 'hey-douga',
    siteName: 'Hey動画',
    siteUrl: 'https://www.hey.tv',
    videoPagePattern: '/moviepages/{id}/',
    videoSelector: 'video, .video-player',
    notes: 'メインプレーヤーのスクリーンショット'
  },
  {
    id: 'etinaa-4610',
    siteName: 'エッチな4610',
    siteUrl: 'https://www.4610.com',
    videoPagePattern: '/data/{id}/',
    videoSelector: 'video, .player-container',
    notes: 'プレーヤー領域のスクリーンショット'
  },
  {
    id: 'etinaa-0930',
    siteName: 'エッチな0930',
    siteUrl: 'https://www.0930.com',
    videoPagePattern: '/data/{id}/',
    videoSelector: 'video, .video-wrap',
    notes: 'プレーヤー領域のスクリーンショット'
  },
  {
    id: 'etinaa-0930world',
    siteName: 'エッチな0930WORLD',
    siteUrl: 'https://www.0930world.com',
    videoPagePattern: '/data/{id}/',
    videoSelector: 'video, .video-container',
    notes: 'プレーヤー領域のスクリーンショット'
  },
  {
    id: 'hitozumagiri',
    siteName: '人妻斬り',
    siteUrl: 'https://www.hitozumagiri.com',
    videoPagePattern: '/data/{id}/',
    videoSelector: 'video, .player',
    notes: 'プレーヤー領域のスクリーンショット'
  },
  {
    id: 'etinaa-0230',
    siteName: 'エッチな0230',
    siteUrl: 'https://www.0230.com',
    videoPagePattern: '/data/{id}/',
    videoSelector: 'video, .video-area',
    notes: 'プレーヤー領域のスクリーンショット'
  },
  {
    id: 'unkotare',
    siteName: 'うんこたれ',
    siteUrl: 'https://www.unkotare.com',
    videoPagePattern: '/data/{id}/',
    videoSelector: 'video, .movie-player',
    notes: 'プレーヤー領域のスクリーンショット'
  },
  {
    id: '3d-eros',
    siteName: '3D-EROS.NET',
    siteUrl: 'https://www.3d-eros.net',
    videoPagePattern: '/moviepages/{id}/',
    videoSelector: 'video, .video-player',
    notes: 'プレーヤー領域のスクリーンショット'
  },
  {
    id: 'pikkur',
    siteName: 'Pikkur',
    siteUrl: 'https://www.pikkur.com',
    videoPagePattern: '/moviepages/{id}/',
    videoSelector: 'video, .player-wrapper',
    notes: 'プレーヤー領域のスクリーンショット'
  },
  {
    id: 'javholic',
    siteName: 'Javholic',
    siteUrl: 'https://www.javholic.com',
    videoPagePattern: '/moviepages/{id}/',
    videoSelector: 'video, .video-container',
    notes: 'プレーヤー領域のスクリーンショット'
  },
  {
    id: 'gachinco-gachi',
    siteName: 'ガチん娘/ガチん子',
    siteUrl: 'https://www.gachinco.com',
    videoPagePattern: '/gachi/{id}/',
    videoSelector: 'video, .player-box',
    notes: 'プレーヤー領域のスクリーンショット'
  },
  {
    id: 'fc2-ppv',
    siteName: 'FC2-PPV',
    siteUrl: 'https://adult.contents.fc2.com',
    videoPagePattern: '/article/{id}/',
    videoSelector: 'video, .fc2-video-player',
    notes: 'プレーヤー領域のスクリーンショット'
  }
];

/**
 * 動画フレームからサムネイルを生成する
 */
export async function generateThumbnailFromVideoFrame(
  videoId: string,
  siteId: string,
  options: VideoFrameExtractionOptions = {}
): Promise<FrameExtractionResult> {
  const {
    outputDir = 'public/images/thumbnails',
    timeout = 30000,
    quality = THUMBNAIL_CONFIG.quality,
    generateWebP = true,
    waitForVideo = 5000,
    screenshotDelay = 2000
  } = options;

  let browser: puppeteer.Browser | null = null;

  try {
    // サイト設定を取得
    const siteConfig = EMBED_SITES.find(site => site.id === siteId);
    if (!siteConfig) {
      return { success: false, error: `サポートされていないサイトID: ${siteId}` };
    }

    // 動画ページURLを生成
    const videoPageUrl = siteConfig.siteUrl + siteConfig.videoPagePattern.replace('{id}', videoId);

    console.log(`Puppeteerで動画フレーム取得開始: ${videoPageUrl}`);

    // Puppeteerブラウザ起動
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // ビューポート設定
    await page.setViewport({ width: 1280, height: 720 });
    
    // ユーザーエージェント設定
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    );

    // ページアクセス
    await page.goto(videoPageUrl, { 
      waitUntil: 'networkidle0', 
      timeout 
    });

    // 動画要素が読み込まれるまで待機
    await page.waitForTimeout(waitForVideo);

    // 動画要素を探す
    let videoElement = null;
    try {
      await page.waitForSelector(siteConfig.videoSelector, { timeout: 10000 });
      videoElement = await page.$(siteConfig.videoSelector);
    } catch {
      console.warn(`動画要素が見つかりません (${siteConfig.videoSelector})、全画面スクリーンショットを実行`);
    }

    // スクリーンショットを撮影
    await page.waitForTimeout(screenshotDelay);
    
    let screenshotBuffer: Buffer;
    if (videoElement) {
      // 動画要素のスクリーンショット
      screenshotBuffer = await videoElement.screenshot({ type: 'png' });
    } else {
      // 全画面スクリーンショット
      screenshotBuffer = await page.screenshot({ 
        type: 'png',
        fullPage: false 
      });
    }

    await browser.close();
    browser = null;

    // サムネイル生成
    return await processCapturedFrame(
      screenshotBuffer,
      videoId,
      siteId,
      outputDir,
      quality,
      generateWebP
    );

  } catch (error) {
    console.error('動画フレーム抽出エラー:', error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('ブラウザクローズエラー:', closeError);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

/**
 * キャプチャしたフレームを処理してサムネイルを生成
 */
async function processCapturedFrame(
  frameBuffer: Buffer,
  videoId: string,
  siteId: string,
  outputDir: string,
  quality: number,
  generateWebP: boolean
): Promise<FrameExtractionResult> {
  try {
    const thumbnails: Thumbnail[] = [];

    // 出力ディレクトリ作成
    const outputPath = path.join(process.cwd(), outputDir, siteId, videoId);
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // JPEG サムネイル生成
    const jpegFileName = `frame-thumbnail.jpg`;
    const jpegOutputPath = path.join(outputPath, jpegFileName);
    
    const jpegBuffer = await sharp(frameBuffer)
      .resize(THUMBNAIL_CONFIG.width, THUMBNAIL_CONFIG.height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality, progressive: true })
      .toBuffer();

    fs.writeFileSync(jpegOutputPath, jpegBuffer);

    // 品質スコアを計算（動画フレームは画像より低く評価）
    const qualityScore = calculateVideoFrameQualityScore(frameBuffer.length);

    const jpegThumbnail: Omit<Thumbnail, 'id' | 'created_at' | 'updated_at'> = {
      video_id: videoId,
      site_id: siteId,
      thumbnail_type: 'video_frame',
      local_path: path.relative(process.cwd(), jpegOutputPath),
      width: THUMBNAIL_CONFIG.width,
      height: THUMBNAIL_CONFIG.height,
      file_size: jpegBuffer.length,
      format: 'jpeg',
      quality_score: qualityScore,
      is_primary: true
    };

    const jpegId = saveThumbnail(jpegThumbnail);
    thumbnails.push({ ...jpegThumbnail, id: jpegId });

    // WebP サムネイル生成
    if (generateWebP) {
      const webpFileName = `frame-thumbnail.webp`;
      const webpOutputPath = path.join(outputPath, webpFileName);
      
      const webpBuffer = await sharp(frameBuffer)
        .resize(THUMBNAIL_CONFIG.width, THUMBNAIL_CONFIG.height, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: quality + 5 })
        .toBuffer();

      fs.writeFileSync(webpOutputPath, webpBuffer);

      const webpThumbnail: Omit<Thumbnail, 'id' | 'created_at' | 'updated_at'> = {
        video_id: videoId,
        site_id: siteId,
        thumbnail_type: 'video_frame',
        local_path: path.relative(process.cwd(), webpOutputPath),
        width: THUMBNAIL_CONFIG.width,
        height: THUMBNAIL_CONFIG.height,
        file_size: webpBuffer.length,
        format: 'webp',
        quality_score: qualityScore,
        is_primary: false
      };

      const webpId = saveThumbnail(webpThumbnail);
      thumbnails.push({ ...webpThumbnail, id: webpId });
    }

    // ad_materialsテーブルを更新
    updateThumbnailCount(videoId);

    return { success: true, thumbnails };

  } catch (error) {
    console.error('フレーム処理エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '処理エラー'
    };
  }
}

/**
 * 動画フレームの品質スコアを計算
 */
function calculateVideoFrameQualityScore(bufferSize: number): number {
  let score = 4; // 動画フレームのベーススコア（画像より低め）

  // バッファサイズによる品質推定
  if (bufferSize > 500000) score += 1.5; // 500KB以上
  else if (bufferSize > 200000) score += 1; // 200KB以上
  else if (bufferSize > 100000) score += 0.5; // 100KB以上
  else score -= 0.5; // 100KB未満は低品質

  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

/**
 * 埋め込みコード専用サイトの一括処理
 */
export async function batchGenerateVideoFrameThumbnails(
  videos: { videoId: string; siteId: string }[],
  options: VideoFrameExtractionOptions = {}
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
      console.log(`動画フレームサムネイル生成中: ${video.videoId} (${video.siteId})`);
      
      const result = await generateThumbnailFromVideoFrame(
        video.videoId,
        video.siteId,
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

      // 負荷軽減のため各処理間に待機時間
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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