import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data.db');

// データベース初期化
const db = new Database(DB_PATH);

console.log('📊 新しいテーブル作成を開始...');

try {
  // 1. ad_tips テーブル作成
  db.exec(`
    CREATE TABLE IF NOT EXISTS ad_tips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_name TEXT NOT NULL UNIQUE,
      site_url TEXT,
      image_zip_url_pattern TEXT,
      embed_code_method TEXT,
      screenshot_path TEXT,
      page_number INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. tip_images テーブル作成
  db.exec(`
    CREATE TABLE IF NOT EXISTS tip_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad_tip_id INTEGER,
      image_type TEXT CHECK(image_type IN ('screenshot', 'ui_guide')),
      file_path TEXT NOT NULL,
      original_pdf_page INTEGER,
      caption TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ad_tip_id) REFERENCES ad_tips(id)
    );
  `);

  // 3. インデックス作成
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ad_tips_site_name ON ad_tips(site_name);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tip_images_ad_tip_id ON tip_images(ad_tip_id);
  `);

  console.log('✅ データベーススキーマ作成完了');
  
  // 作成されたテーブル構造を表示
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%tip%' ORDER BY name").all();
  console.log('📋 作成されたテーブル:', tables.map(t => t.name).join(', '));

} catch (error) {
  console.error('❌ データベーススキーマ作成エラー:', error.message);
} finally {
  db.close();
}