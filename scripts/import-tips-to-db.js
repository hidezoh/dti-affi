import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../data.db');
const TIPS_DATA_PATH = path.join(__dirname, '../data/extracted-tips.json');
const IMAGES_DATA_PATH = path.join(__dirname, '../data/extracted-images.json');

/**
 * 抽出されたPDFデータをデータベースに投入
 */
async function importTipsToDatabase() {
  let db;
  
  try {
    console.log('💾 データベースインポート開始...');
    
    // データベース接続
    db = new Database(DB_PATH);
    
    // データファイル存在確認
    if (!fs.existsSync(TIPS_DATA_PATH)) {
      throw new Error(`Tips データファイルが見つかりません: ${TIPS_DATA_PATH}`);
    }
    
    // データ読み込み
    const tipsData = JSON.parse(fs.readFileSync(TIPS_DATA_PATH, 'utf8'));
    const imagesData = fs.existsSync(IMAGES_DATA_PATH) 
      ? JSON.parse(fs.readFileSync(IMAGES_DATA_PATH, 'utf8'))
      : null;
    
    console.log(`📊 インポート対象:`);
    console.log(`  - サイト情報: ${tipsData.site_tips?.length || 0}件`);
    console.log(`  - 画像情報: ${imagesData?.images?.length || 0}件`);
    
    // トランザクション開始
    const importTransaction = db.transaction(() => {
      
      // 1. ad_tips テーブルへの投入
      const insertTipStmt = db.prepare(`
        INSERT OR REPLACE INTO ad_tips (
          site_name, site_url, image_zip_url_pattern, embed_code_method,
          screenshot_path, page_number, notes, updated_at
        ) VALUES (
          @site_name, @site_url, @image_zip_url_pattern, @embed_code_method,
          @screenshot_path, @page_number, @notes, CURRENT_TIMESTAMP
        )
      `);
      
      const getTipIdStmt = db.prepare('SELECT id FROM ad_tips WHERE site_name = ?');
      
      // 2. tip_images テーブルへの投入
      const insertImageStmt = db.prepare(`
        INSERT OR REPLACE INTO tip_images (
          ad_tip_id, image_type, file_path, original_pdf_page, caption
        ) VALUES (
          @ad_tip_id, @image_type, @file_path, @original_pdf_page, @caption
        )
      `);
      
      let tipsInserted = 0;
      let imagesInserted = 0;
      
      // サイト情報の投入
      if (tipsData.site_tips && Array.isArray(tipsData.site_tips)) {
        for (const tip of tipsData.site_tips) {
          try {
            // バリデーション
            if (!tip.site_name || typeof tip.site_name !== 'string') {
              console.warn(`⚠️ 無効なサイト名をスキップ:`, tip);
              continue;
            }
            
            // データ準備
            const tipData = {
              site_name: sanitizeText(tip.site_name),
              site_url: sanitizeUrl(tip.site_url),
              image_zip_url_pattern: sanitizeUrl(tip.image_zip_url_pattern),
              embed_code_method: sanitizeText(tip.embed_code_method),
              screenshot_path: null, // 後で画像データから設定
              page_number: validatePageNumber(tip.page_number),
              notes: sanitizeText(tip.notes)
            };
            
            // 投入実行
            insertTipStmt.run(tipData);
            tipsInserted++;
            
            console.log(`  ✅ サイト追加: ${tipData.site_name} (ページ: ${tipData.page_number})`);
            
          } catch (error) {
            console.error(`  ❌ サイト投入エラー (${tip.site_name}):`, error.message);
          }
        }
      }
      
      // 画像情報の投入
      if (imagesData && imagesData.images && Array.isArray(imagesData.images)) {
        for (const image of imagesData.images) {
          try {
            // 対応するサイト情報を検索
            const correspondingTip = tipsData.site_tips?.find(tip => 
              tip.page_number === image.page_number
            );
            
            if (!correspondingTip) {
              console.warn(`⚠️ ページ ${image.page_number} に対応するサイト情報が見つかりません`);
              continue;
            }
            
            // サイトIDを取得
            const tipRecord = getTipIdStmt.get(correspondingTip.site_name);
            if (!tipRecord) {
              console.warn(`⚠️ サイト '${correspondingTip.site_name}' のIDが取得できません`);
              continue;
            }
            
            // 画像データ準備
            const imageData = {
              ad_tip_id: tipRecord.id,
              image_type: validateImageType(image.image_type),
              file_path: sanitizeText(image.file_path),
              original_pdf_page: validatePageNumber(image.page_number),
              caption: generateImageCaption(correspondingTip, image)
            };
            
            // 投入実行
            insertImageStmt.run(imageData);
            imagesInserted++;
            
            // スクリーンショットパスの更新
            if (image.image_type === 'screenshot') {
              const updateScreenshotStmt = db.prepare(
                'UPDATE ad_tips SET screenshot_path = ? WHERE id = ?'
              );
              updateScreenshotStmt.run(image.file_path, tipRecord.id);
            }
            
            console.log(`  ✅ 画像追加: ${imageData.file_path} (${imageData.image_type})`);
            
          } catch (error) {
            console.error(`  ❌ 画像投入エラー:`, error.message);
          }
        }
      }
      
      return { tipsInserted, imagesInserted };
    });
    
    // トランザクション実行
    const result = importTransaction();
    
    console.log(`✅ インポート完了:`);
    console.log(`  - サイト情報: ${result.tipsInserted}件`);
    console.log(`  - 画像情報: ${result.imagesInserted}件`);
    
    // 投入結果確認
    await verifyImportedData(db);
    
    return result;

  } catch (error) {
    console.error('❌ データベースインポートエラー:', error.message);
    throw error;
  } finally {
    if (db) {
      db.close();
    }
  }
}

/**
 * テキストのサニタイズ
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') return null;
  return text.trim().substring(0, 500); // 最大500文字
}

/**
 * URLのサニタイズ
 */
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  
  const trimmed = url.trim();
  
  // 基本的なURL形式チェック
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null;
  }
  
  return trimmed.substring(0, 300); // 最大300文字
}

/**
 * ページ番号のバリデーション
 */
function validatePageNumber(pageNum) {
  const num = parseInt(pageNum);
  return (num >= 1 && num <= 1000) ? num : null;
}

/**
 * 画像タイプのバリデーション
 */
function validateImageType(imageType) {
  const validTypes = ['screenshot', 'ui_guide'];
  return validTypes.includes(imageType) ? imageType : 'screenshot';
}

/**
 * 画像キャプションを生成
 */
function generateImageCaption(tip, image) {
  const parts = [];
  
  if (tip.site_name) {
    parts.push(`${tip.site_name}のガイド画像`);
  }
  
  if (image.image_type === 'screenshot') {
    parts.push('スクリーンショット');
  } else if (image.image_type === 'ui_guide') {
    parts.push('UI操作ガイド');
  }
  
  parts.push(`(PDF ページ ${image.page_number})`);
  
  return parts.join(' - ');
}

/**
 * インポート結果の確認
 */
async function verifyImportedData(db) {
  try {
    console.log('🔍 データベース内容確認...');
    
    // ad_tips テーブルの確認
    const tipsCount = db.prepare('SELECT COUNT(*) as count FROM ad_tips').get();
    console.log(`📋 ad_tips テーブル: ${tipsCount.count}件`);
    
    // tip_images テーブルの確認
    const imagesCount = db.prepare('SELECT COUNT(*) as count FROM tip_images').get();
    console.log(`🖼️ tip_images テーブル: ${imagesCount.count}件`);
    
    // サンプルデータ表示
    const sampleTips = db.prepare('SELECT site_name, page_number, embed_code_method FROM ad_tips LIMIT 3').all();
    console.log(`📄 サンプルサイト:`, sampleTips.map(tip => `${tip.site_name} (ページ${tip.page_number})`));
    
    // 画像統計
    const imageStats = db.prepare(`
      SELECT image_type, COUNT(*) as count 
      FROM tip_images 
      GROUP BY image_type
    `).all();
    
    console.log(`📊 画像統計:`);
    imageStats.forEach(stat => {
      console.log(`  - ${stat.image_type}: ${stat.count}件`);
    });
    
  } catch (error) {
    console.warn('⚠️ データ確認エラー:', error.message);
  }
}

/**
 * データベースのバックアップ
 */
function createDatabaseBackup() {
  try {
    const backupPath = `${DB_PATH}.backup.${new Date().toISOString().split('T')[0]}`;
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`💾 データベースバックアップ作成: ${backupPath}`);
  } catch (error) {
    console.warn('⚠️ バックアップ作成失敗:', error.message);
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  // 実行前にバックアップ作成
  createDatabaseBackup();
  
  importTipsToDatabase()
    .then(() => console.log('🎉 データベースインポート処理完了'))
    .catch(error => {
      console.error('💥 データベースインポート処理失敗:', error.message);
      process.exit(1);
    });
}