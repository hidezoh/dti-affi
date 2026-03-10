import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";
import axios from "axios";

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
    id: "caribbeancom",
    siteName: "カリビアンコム",
    siteUrl: "https://www.caribbeancompr.com",
    imageZipUrlPattern: "/moviepages/{id}/images/gallery.zip",
    hasEmbedCode: true,
    notes: "作品によっては提供されない場合がある",
  },
  {
    id: "1pondo",
    siteName: "一本道",
    siteUrl: "https://www.1pondo.tv",
    imageZipUrlPattern: "/assets/sample/{id}/gallery.zip",
    hasEmbedCode: true,
    notes: "作品によっては提供されない場合がある",
  },
  {
    id: "10musume",
    siteName: "天然むすめ",
    siteUrl: "https://www.10musume.com",
    imageZipUrlPattern: "/assets/sample/{id}/gallery.zip",
    hasEmbedCode: true,
    notes: "作品によっては提供されない場合がある",
  },
  {
    id: "pacopacomama",
    siteName: "パコパコママ",
    siteUrl: "https://www.pacopacomama.com",
    imageZipUrlPattern: "/assets/sample/{id}/gallery.zip",
    hasEmbedCode: true,
    notes: "作品によっては提供されない場合がある",
  },
  {
    id: "heyzo",
    siteName: "HEYZO",
    siteUrl: "https://www.heyzo.com",
    imageZipUrlPattern: "/moviepages/{id}/gallery.zip",
    hasEmbedCode: true,
    notes: "作品によっては提供されない場合がある",
  },
  {
    id: "kin8tengoku",
    siteName: "金髪天國",
    siteUrl: "https://www.kin8tengoku.com",
    imageZipUrlPattern: "/moviepages/{id}/gallery.zip",
    hasEmbedCode: true,
    notes: "作品によっては提供されない場合がある",
  },
  {
    id: "nyoshin",
    siteName: "女体のしんぴ",
    siteUrl: "https://www.nyoshin.com",
    imageZipUrlPattern: "/moviepages/{id}/index.zip",
    hasEmbedCode: true,
    notes: "作品によっては提供されない場合がある",
  },
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
  const siteConfig = AD_SITES.find((site) => site.id === siteId);
  if (!siteConfig) {
    throw new Error(`サポートされていないサイトID: ${siteId}`);
  }

  const zipUrl = siteConfig.siteUrl + siteConfig.imageZipUrlPattern.replace("{id}", videoId);
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
  } = {},
): Promise<{
  success: boolean;
  imageDirectory?: string;
  extractedFiles?: string[];
  error?: string;
}> {
  const { timeout = 30000, maxRetries = 3, outputBaseDir = "public/images/ad-materials" } = options;

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
        responseType: "arraybuffer",
        timeout,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      if (response.status !== 200) {
        throw new Error(`HTTPエラー: ${response.status}`);
      }

      // ZIP解凍
      const zip = new AdmZip(Buffer.from(response.data));
      const zipEntries = zip.getEntries();

      if (zipEntries.length === 0) {
        throw new Error("ZIPファイルが空です");
      }

      // 出力ディレクトリを作成
      const siteConfig = AD_SITES.find((site) => site.id === siteId);
      const imageDirectory = path.join(process.cwd(), outputBaseDir, siteConfig!.siteName, videoId);

      if (!fs.existsSync(imageDirectory)) {
        fs.mkdirSync(imageDirectory, { recursive: true });
      }

      // 画像ファイルを抽出・保存
      const extractedFiles: string[] = [];
      const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

      for (const entry of zipEntries) {
        const fileName = entry.entryName;
        const fileExtension = path.extname(fileName).toLowerCase();

        // 画像ファイルのみを処理
        if (imageExtensions.includes(fileExtension) && !entry.isDirectory) {
          // パストラバーサル攻撃を防ぐためのセキュリティチェック
          const sanitizedFileName = path.basename(fileName);
          if (
            sanitizedFileName !== fileName ||
            fileName.includes("..") ||
            path.isAbsolute(fileName)
          ) {
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
        throw new Error("ZIPファイルに画像ファイルが含まれていません");
      }

      return {
        success: true,
        imageDirectory,
        extractedFiles,
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
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || "不明なエラー",
  };
}
