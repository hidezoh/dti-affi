import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import axios from 'axios';
import sharp from 'sharp';

const DB_PATH = path.join(process.cwd(), 'data.db');

// サイト別URLパターンの定義
export interface AdSiteConfig {
  id: string;
  siteName: string;
  siteUrl: string;
  imageZipUrlPattern: string;
  hasEmbedCode: boolean;
  notes?: string;
}

// 裏技_Ad_tips.mdから抽出したサイト設定
export const AD_SITES: AdSiteConfig[] = [
  {
    id: 'caribbeancom',
    siteName: 'カリビアンコム',
    siteUrl: 'https://www.caribbeancompr.com',
    imageZipUrlPattern: '/moviepages/{id}/images/gallery.zip',
    hasEmbedCode: true,
    notes: '作品によっては提供されない場合がある'
  },
  {
    id: '1pondo',
    siteName: '一本道',
    siteUrl: 'https://www.1pondo.tv',
    imageZipUrlPattern: '/assets/sample/{id}/gallery.zip',
    hasEmbedCode: true,
    notes: '作品によっては提供されない場合がある'
  },
  {
    id: '10musume',
    siteName: '天然むすめ',
    siteUrl: 'https://www.10musume.com',
    imageZipUrlPattern: '/assets/sample/{id}/gallery.zip',
    hasEmbedCode: true,
    notes: '作品によっては提供されない場合がある'
  },
  {
    id: 'pacopacomama',
    siteName: 'パコパコママ',
    siteUrl: 'https://www.pacopacomama.com',
    imageZipUrlPattern: '/assets/sample/{id}/gallery.zip',
    hasEmbedCode: true,
    notes: '作品によっては提供されない場合がある'
  },
  {
    id: 'heyzo',
    siteName: 'HEYZO',
    siteUrl: 'https://www.heyzo.com',
    imageZipUrlPattern: '/moviepages/{id}/gallery.zip',
    hasEmbedCode: true,
    notes: '作品によっては提供されない場合がある'
  },
  {
    id: 'kin8tengoku',
    siteName: '金髪天國',
    siteUrl: 'https://www.kin8tengoku.com',
    imageZipUrlPattern: '/moviepages/{id}/gallery.zip',
    hasEmbedCode: true,
    notes: '作品によっては提供されない場合がある'
  },
  {
    id: 'nyoshin',
    siteName: '女体のしんぴ',
    siteUrl: 'https://www.nyoshin.com',
    imageZipUrlPattern: '/moviepages/{id}/index.zip',
    hasEmbedCode: true,
    notes: '作品によっては提供されない場合がある'
  }
];

export interface AdMaterial {
  id?: number;
  videoId: string;
  siteId: string;
  imageZipUrl?: string;
  imageZipDownloaded: boolean;
  imageDirectory?: string;
  embedCode?: string;
  embedCodeAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdImage {
  id?: number;
  materialId: number;
  fileName: string;
  filePath: string;
  fileSize?: number;
  width?: number;
  height?: number;
  createdAt?: string;
}

/**
 * サイト設定に基づいてZIP URLを生成する
 */
export function generateImageZipUrl(siteId: string, videoId: string): string | null {
  const siteConfig = AD_SITES.find(site => site.id === siteId);
  if (!siteConfig) {
    throw new Error(`サポートされていないサイトID: ${siteId}`);
  }

  const zipUrl = siteConfig.siteUrl + siteConfig.imageZipUrlPattern.replace('{id}', videoId);
  return zipUrl;
}

/**
 * 画像ZIPファイルをダウンロードし、解凍して保存する
 */
export async function downloadAndExtractImages(
  videoId: string, 
  siteId: string,
  options: {
    timeout?: number;
    maxRetries?: number;
    outputBaseDir?: string;
  } = {}
): Promise<{
  success: boolean;
  imageDirectory?: string;
  extractedFiles?: string[];
  error?: string;
}> {
  const { timeout = 30000, maxRetries = 3, outputBaseDir = 'public/images/ad-materials' } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // ZIP URLを生成
      const zipUrl = generateImageZipUrl(siteId, videoId);
      if (!zipUrl) {
        return { success: false, error: `サイト設定が見つかりません: ${siteId}` };
      }

      console.log(`[試行 ${attempt}] ZIP ダウンロード開始: ${zipUrl}`);

      // ZIPファイルをダウンロード
      const response = await axios.get(zipUrl, {
        responseType: 'arraybuffer',
        timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (response.status !== 200) {
        throw new Error(`HTTPエラー: ${response.status}`);
      }

      // ZIP解凍
      const zip = new AdmZip(Buffer.from(response.data));
      const zipEntries = zip.getEntries();

      if (zipEntries.length === 0) {
        throw new Error('ZIPファイルが空です');
      }

      // 出力ディレクトリを作成
      const siteConfig = AD_SITES.find(site => site.id === siteId);
      const imageDirectory = path.join(process.cwd(), outputBaseDir, siteConfig!.siteName, videoId);
      
      if (!fs.existsSync(imageDirectory)) {
        fs.mkdirSync(imageDirectory, { recursive: true });
      }

      // 画像ファイルを抽出・保存
      const extractedFiles: string[] = [];
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

      for (const entry of zipEntries) {
        const fileName = entry.entryName;
        const fileExtension = path.extname(fileName).toLowerCase();
        
        // 画像ファイルのみを処理
        if (imageExtensions.includes(fileExtension) && !entry.isDirectory) {
          // パストラバーサル攻撃を防ぐためのセキュリティチェック
          const sanitizedFileName = path.basename(fileName);
          if (sanitizedFileName !== fileName || fileName.includes('..') || path.isAbsolute(fileName)) {
            console.warn(`安全でないファイル名をスキップ: ${fileName}`);
            continue;
          }
          
          const outputPath = path.join(imageDirectory, sanitizedFileName);
          const outputDir = path.dirname(outputPath);
          
          // outputPathがimageDirectory内にあることを確認
          if (!outputPath.startsWith(imageDirectory)) {
            console.warn(`安全でないパスをスキップ: ${fileName}`);
            continue;
          }
          
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          zip.extractEntryTo(entry, outputDir, false, true);
          extractedFiles.push(sanitizedFileName);
          
          console.log(`画像ファイルを保存: ${outputPath}`);
        }
      }

      if (extractedFiles.length === 0) {
        throw new Error('ZIPファイルに画像ファイルが含まれていません');
      }

      return {
        success: true,
        imageDirectory,
        extractedFiles
      };

    } catch (error) {
      lastError = error as Error;
      console.error(`[試行 ${attempt}] エラー:`, error);
      
      // 404エラーの場合はリトライしない
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        break;
      }
      
      // 最後の試行でない場合は少し待機
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || '不明なエラー'
  };
}

/**
 * データベースに広告素材レコードを保存する
 */
export function saveAdMaterialRecord(material: Omit<AdMaterial, 'id' | 'createdAt' | 'updatedAt'>): number {
  const db = new Database(DB_PATH);
  
  try {
    // テーブルが存在しない場合は作成
    db.exec(`
      CREATE TABLE IF NOT EXISTS ad_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT NOT NULL,
        site_id TEXT NOT NULL,
        image_zip_url TEXT,
        image_zip_downloaded BOOLEAN DEFAULT 0,
        image_directory TEXT,
        embed_code TEXT,
        embed_code_available BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const stmt = db.prepare(`
      INSERT INTO ad_materials (
        video_id, site_id, image_zip_url, image_zip_downloaded, 
        image_directory, embed_code, embed_code_available
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      material.videoId,
      material.siteId,
      material.imageZipUrl,
      material.imageZipDownloaded ? 1 : 0,
      material.imageDirectory,
      material.embedCode,
      material.embedCodeAvailable ? 1 : 0
    );

    return result.lastInsertRowid as number;
  } finally {
    db.close();
  }
}

/**
 * データベースに画像ファイル情報を保存する
 */
export async function saveImageRecords(
  materialId: number, 
  imageDirectory: string, 
  extractedFiles: string[]
): Promise<void> {
  const db = new Database(DB_PATH);
  
  try {
    // テーブルが存在しない場合は作成
    db.exec(`
      CREATE TABLE IF NOT EXISTS ad_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        width INTEGER,
        height INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_ad_images_material_id ON ad_images(material_id)');

    const stmt = db.prepare(`
      INSERT INTO ad_images (
        material_id, file_name, file_path, file_size, width, height
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const fileName of extractedFiles) {
      const filePath = path.join(imageDirectory, fileName);
      
      try {
        // ファイル情報を取得
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;

        // 画像のメタデータを取得
        let width: number | undefined;
        let height: number | undefined;

        try {
          const metadata = await sharp(filePath).metadata();
          width = metadata.width;
          height = metadata.height;
        } catch (sharpError) {
          console.warn(`画像メタデータの取得に失敗: ${fileName}`, sharpError);
        }

        stmt.run(materialId, fileName, filePath, fileSize, width, height);
        
      } catch (fileError) {
        console.error(`ファイル情報の取得に失敗: ${fileName}`, fileError);
      }
    }
  } finally {
    db.close();
  }
}

/**
 * 画像ZIP取得の完全なワークフロー
 */
export async function downloadImageMaterials(
  videoId: string,
  siteId: string,
  options?: {
    timeout?: number;
    maxRetries?: number;
    outputBaseDir?: string;
  }
): Promise<{
  success: boolean;
  materialId?: number;
  imageDirectory?: string;
  extractedFiles?: string[];
  error?: string;
}> {
  try {
    // 1. ZIPファイルをダウンロード・解凍
    const downloadResult = await downloadAndExtractImages(videoId, siteId, options);
    
    if (!downloadResult.success) {
      return {
        success: false,
        error: downloadResult.error
      };
    }

    // 2. データベースに広告素材レコードを保存
    const zipUrl = generateImageZipUrl(siteId, videoId);
    const materialId = saveAdMaterialRecord({
      videoId,
      siteId,
      imageZipUrl: zipUrl || undefined,
      imageZipDownloaded: true,
      imageDirectory: downloadResult.imageDirectory,
      embedCodeAvailable: false
    });

    // 3. 画像ファイル情報をデータベースに保存
    if (downloadResult.extractedFiles && downloadResult.imageDirectory) {
      await saveImageRecords(materialId, downloadResult.imageDirectory, downloadResult.extractedFiles);
    }

    return {
      success: true,
      materialId,
      imageDirectory: downloadResult.imageDirectory,
      extractedFiles: downloadResult.extractedFiles
    };

  } catch (error) {
    console.error('画像素材ダウンロードエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}