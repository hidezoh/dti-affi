/**
 * 広告画像ダウンロードスクリプト
 * 使用方法: node scripts/download-ad-images.js <videoId> <siteId>
 * 例: node scripts/download-ad-images.js "113019_002" "caribbeancom"
 */

import { downloadImageMaterials, AD_SITES } from '../src/lib/ad-materials.ts';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('使用方法: node scripts/download-ad-images.js <videoId> <siteId>');
    console.error('');
    console.error('サポートされているサイトID:');
    AD_SITES.forEach(site => {
      console.error(`  ${site.id} - ${site.siteName}`);
    });
    process.exit(1);
  }

  const [videoId, siteId] = args;

  // サイトIDの検証
  const siteConfig = AD_SITES.find(site => site.id === siteId);
  if (!siteConfig) {
    console.error(`エラー: サポートされていないサイトID: ${siteId}`);
    console.error('');
    console.error('サポートされているサイトID:');
    AD_SITES.forEach(site => {
      console.error(`  ${site.id} - ${site.siteName}`);
    });
    process.exit(1);
  }

  console.log(`画像ダウンロード開始...`);
  console.log(`動画ID: ${videoId}`);
  console.log(`サイト: ${siteConfig.siteName} (${siteId})`);
  console.log('');

  try {
    const result = await downloadImageMaterials(videoId, siteId, {
      timeout: 30000,
      maxRetries: 3
    });

    if (result.success) {
      console.log('✅ ダウンロード成功!');
      console.log(`保存ディレクトリ: ${result.imageDirectory}`);
      console.log(`抽出ファイル数: ${result.extractedFiles?.length || 0}`);
      console.log(`データベースID: ${result.materialId}`);
      
      if (result.extractedFiles && result.extractedFiles.length > 0) {
        console.log('');
        console.log('抽出されたファイル:');
        result.extractedFiles.forEach(fileName => {
          console.log(`  - ${fileName}`);
        });
      }
    } else {
      console.error('❌ ダウンロード失敗');
      console.error(`エラー: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみmain()を呼び出し
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('スクリプト実行エラー:', error);
    process.exit(1);
  });
}