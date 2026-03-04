#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';
import { createThumbnailsTable } from '../src/lib/thumbnail-database.ts';
import { batchGenerateThumbnails } from '../src/lib/thumbnail-generator.ts';
import { batchGenerateVideoFrameThumbnails } from '../src/lib/video-frame-extractor.ts';
import { AD_SITES } from '../src/lib/ad-materials.ts';
import { EMBED_SITES } from '../src/lib/video-frame-extractor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// コマンドライン引数の解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    help: false,
    mode: 'mixed', // mixed, zip, video
    limit: 50,
    quality: 85,
    generateWebP: true,
    videoId: null,
    siteId: null,
    force: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--mode':
      case '-m':
        options.mode = args[++i] || 'mixed';
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i]) || 50;
        break;
      case '--quality':
      case '-q':
        options.quality = parseInt(args[++i]) || 85;
        break;
      case '--no-webp':
        options.generateWebP = false;
        break;
      case '--video-id':
      case '-v':
        options.videoId = args[++i];
        break;
      case '--site-id':
      case '-s':
        options.siteId = args[++i];
        break;
      case '--force':
      case '-f':
        options.force = true;
        break;
      default:
        console.warn(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

// ヘルプメッセージ
function showHelp() {
  console.log(`
サムネイル自動生成ツール

使用方法:
  npm run generate-thumbnails [options]

オプション:
  -h, --help           このヘルプを表示
  -m, --mode MODE      生成モード (mixed|zip|video) [デフォルト: mixed]
  -l, --limit NUM      処理する動画の最大数 [デフォルト: 50]
  -q, --quality NUM    JPEG品質 (1-100) [デフォルト: 85]
  --no-webp           WebP形式を生成しない
  -v, --video-id ID   特定の動画IDのみ処理
  -s, --site-id ID    特定のサイトIDのみ処理
  -f, --force         既存サムネイルを上書き

生成モード:
  mixed    ZIP画像と動画フレーム両方を処理 (デフォルト)
  zip      ZIP画像のみを処理
  video    動画フレームのみを処理

例:
  npm run generate-thumbnails
  npm run generate-thumbnails --mode zip --limit 10
  npm run generate-thumbnails --video-id "123456" --site-id "caribbeancom"
  npm run generate-thumbnails --mode video --quality 90 --force

サポートサイト:
  ZIP画像対応: ${AD_SITES.map(s => s.id).join(', ')}
  動画フレーム対応: ${EMBED_SITES.map(s => s.id).join(', ')}
`);
}

// データベースから対象動画を取得
function getTargetVideos(options) {
  const dbPath = join(__dirname, '..', 'data.db');
  const db = new Database(dbPath, { readonly: true });

  let query = `
    SELECT DISTINCT v.id, v.site_id, am.image_directory
    FROM videos v
    LEFT JOIN ad_materials am ON v.id = am.video_id
  `;

  const conditions = [];
  const params = [];

  if (options.videoId) {
    conditions.push('v.id = ?');
    params.push(options.videoId);
  }

  if (options.siteId) {
    conditions.push('v.site_id = ?');
    params.push(options.siteId);
  }

  // 既存サムネイルの処理
  if (!options.force) {
    query += `
      LEFT JOIN thumbnails t ON v.id = t.video_id
    `;
    conditions.push('t.id IS NULL'); // サムネイルが未生成のもののみ
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ` ORDER BY v.release_date DESC LIMIT ?`;
  params.push(options.limit);

  try {
    const stmt = db.prepare(query);
    const videos = stmt.all(...params);
    db.close();
    return videos;
  } catch (error) {
    db.close();
    throw error;
  }
}

// メイン処理
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🎬 サムネイル自動生成ツール');
  console.log('=====================================');

  try {
    // データベーステーブルを初期化
    console.log('📋 データベース初期化中...');
    createThumbnailsTable();
    
    // 対象動画を取得
    console.log('🔍 対象動画を検索中...');
    const videos = getTargetVideos(options);
    
    if (videos.length === 0) {
      console.log('✅ 処理対象の動画が見つかりませんでした');
      process.exit(0);
    }

    console.log(`📹 ${videos.length}件の動画を処理します`);
    console.log(`⚙️  設定: モード=${options.mode}, 品質=${options.quality}, WebP=${options.generateWebP}`);
    console.log('');

    const results = {
      zipVideos: [],
      embedVideos: [],
      totalSuccess: 0,
      totalFailed: 0
    };

    // 動画を分類
    for (const video of videos) {
      const isZipSite = AD_SITES.some(site => site.id === video.site_id);
      const isEmbedSite = EMBED_SITES.some(site => site.id === video.site_id);

      if (!isZipSite && !isEmbedSite) {
        console.warn(`⚠️  サポートされていないサイト: ${video.site_id} (${video.id})`);
        continue;
      }

      if (options.mode === 'zip' && !isZipSite) continue;
      if (options.mode === 'video' && !isEmbedSite) continue;

      if (isZipSite && video.image_directory) {
        results.zipVideos.push({
          videoId: video.id,
          siteId: video.site_id,
          imageDirectory: video.image_directory
        });
      } else if (isEmbedSite) {
        results.embedVideos.push({
          videoId: video.id,
          siteId: video.site_id
        });
      }
    }

    // ZIP画像からサムネイル生成
    if (results.zipVideos.length > 0) {
      console.log(`🖼️  ZIP画像サムネイル生成開始 (${results.zipVideos.length}件)`);
      const zipResult = await batchGenerateThumbnails(results.zipVideos, {
        quality: options.quality,
        generateWebP: options.generateWebP
      });
      
      console.log(`✅ ZIP処理完了: 成功${zipResult.success}件, 失敗${zipResult.failed}件`);
      results.totalSuccess += zipResult.success;
      results.totalFailed += zipResult.failed;

      // 詳細結果の表示
      if (zipResult.failed > 0) {
        console.log('\n❌ ZIP処理失敗:');
        zipResult.results
          .filter(r => !r.success)
          .forEach(r => console.log(`   ${r.videoId}: ${r.error}`));
      }
    }

    // 動画フレームからサムネイル生成
    if (results.embedVideos.length > 0) {
      console.log(`\n🎥 動画フレームサムネイル生成開始 (${results.embedVideos.length}件)`);
      const videoResult = await batchGenerateVideoFrameThumbnails(results.embedVideos, {
        quality: options.quality,
        generateWebP: options.generateWebP
      });
      
      console.log(`✅ 動画処理完了: 成功${videoResult.success}件, 失敗${videoResult.failed}件`);
      results.totalSuccess += videoResult.success;
      results.totalFailed += videoResult.failed;

      // 詳細結果の表示
      if (videoResult.failed > 0) {
        console.log('\n❌ 動画処理失敗:');
        videoResult.results
          .filter(r => !r.success)
          .forEach(r => console.log(`   ${r.videoId}: ${r.error}`));
      }
    }

    // 最終結果
    console.log('\n📊 最終結果');
    console.log('=====================================');
    console.log(`✅ 成功: ${results.totalSuccess}件`);
    console.log(`❌ 失敗: ${results.totalFailed}件`);
    console.log(`📈 成功率: ${results.totalSuccess + results.totalFailed > 0 ? 
      Math.round((results.totalSuccess / (results.totalSuccess + results.totalFailed)) * 100) : 0}%`);

    process.exit(results.totalFailed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 処理中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('💥 予期しないエラー:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 未処理のPromise拒否:', reason);
  process.exit(1);
});

// 実行
main();