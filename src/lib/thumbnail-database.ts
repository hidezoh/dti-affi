import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data.db');

export interface Thumbnail {
  id?: number;
  video_id: string;
  site_id: string;
  thumbnail_type: 'zip_image' | 'video_frame' | 'screenshot' | 'manual';
  original_url?: string;
  local_path: string;
  width: number;
  height: number;
  file_size?: number;
  format: 'jpeg' | 'webp' | 'png';
  quality_score: number; // 1-10の品質評価
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * thumbnailsテーブルを作成する
 */
export function createThumbnailsTable(): void {
  const db = new Database(DB_PATH);
  
  try {
    // thumbnailsテーブル作成
    db.exec(`
      CREATE TABLE IF NOT EXISTS thumbnails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT NOT NULL,
        site_id TEXT NOT NULL,
        thumbnail_type TEXT NOT NULL CHECK (thumbnail_type IN ('zip_image', 'video_frame', 'screenshot', 'manual')),
        original_url TEXT,
        local_path TEXT NOT NULL,
        width INTEGER DEFAULT 300,
        height INTEGER DEFAULT 200,
        file_size INTEGER,
        format TEXT DEFAULT 'jpeg' CHECK (format IN ('jpeg', 'webp', 'png')),
        quality_score INTEGER DEFAULT 5 CHECK (quality_score BETWEEN 1 AND 10),
        is_primary BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos(id),
        UNIQUE(video_id, site_id, thumbnail_type)
      )
    `);

    // インデックス作成
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_thumbnails_video_id ON thumbnails(video_id)
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_thumbnails_primary ON thumbnails(video_id, is_primary)
    `);

    // ad_materialsテーブルの拡張
    db.exec(`
      ALTER TABLE ad_materials ADD COLUMN thumbnail_count INTEGER DEFAULT 0
    `);
    
    db.exec(`
      ALTER TABLE ad_materials ADD COLUMN primary_thumbnail_id INTEGER
    `);

    console.log('データベーステーブルを正常に作成しました');
  } catch (error) {
    // カラムが既に存在する場合のエラーを無視
    if (!error.message?.includes('duplicate column name')) {
      console.error('データベーステーブル作成エラー:', error);
      throw error;
    }
  } finally {
    db.close();
  }
}

/**
 * サムネイルレコードを保存する
 */
export function saveThumbnail(thumbnail: Omit<Thumbnail, 'id' | 'created_at' | 'updated_at'>): number {
  const db = new Database(DB_PATH);
  
  try {
    const stmt = db.prepare(`
      INSERT INTO thumbnails (
        video_id, site_id, thumbnail_type, original_url, local_path,
        width, height, file_size, format, quality_score, is_primary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      thumbnail.video_id,
      thumbnail.site_id,
      thumbnail.thumbnail_type,
      thumbnail.original_url,
      thumbnail.local_path,
      thumbnail.width,
      thumbnail.height,
      thumbnail.file_size,
      thumbnail.format,
      thumbnail.quality_score,
      thumbnail.is_primary ? 1 : 0
    );

    return result.lastInsertRowid as number;
  } finally {
    db.close();
  }
}

/**
 * 動画IDに対するサムネイルを取得する
 */
export function getThumbnailsByVideoId(videoId: string): Thumbnail[] {
  const db = new Database(DB_PATH, { readonly: true });
  
  try {
    const stmt = db.prepare(`
      SELECT * FROM thumbnails 
      WHERE video_id = ? 
      ORDER BY is_primary DESC, quality_score DESC
    `);
    
    return stmt.all(videoId) as Thumbnail[];
  } finally {
    db.close();
  }
}

/**
 * プライマリサムネイルを取得する
 */
export function getPrimaryThumbnail(videoId: string): Thumbnail | null {
  const db = new Database(DB_PATH, { readonly: true });
  
  try {
    const stmt = db.prepare(`
      SELECT * FROM thumbnails 
      WHERE video_id = ? AND is_primary = 1 
      ORDER BY quality_score DESC 
      LIMIT 1
    `);
    
    return stmt.get(videoId) as Thumbnail || null;
  } finally {
    db.close();
  }
}

/**
 * プライマリサムネイルを設定する
 */
export function setPrimaryThumbnail(videoId: string, thumbnailId: number): void {
  const db = new Database(DB_PATH);
  
  try {
    db.transaction(() => {
      // 現在のプライマリフラグを全てfalseにする
      const resetStmt = db.prepare(`
        UPDATE thumbnails 
        SET is_primary = 0 
        WHERE video_id = ?
      `);
      resetStmt.run(videoId);

      // 指定されたサムネイルをプライマリに設定
      const setStmt = db.prepare(`
        UPDATE thumbnails 
        SET is_primary = 1 
        WHERE id = ? AND video_id = ?
      `);
      setStmt.run(thumbnailId, videoId);
    })();
  } finally {
    db.close();
  }
}

/**
 * サムネイルを削除する
 */
export function deleteThumbnail(thumbnailId: number): void {
  const db = new Database(DB_PATH);
  
  try {
    const stmt = db.prepare('DELETE FROM thumbnails WHERE id = ?');
    stmt.run(thumbnailId);
  } finally {
    db.close();
  }
}

/**
 * ad_materialsテーブルのサムネイル数を更新する
 */
export function updateThumbnailCount(videoId: string): void {
  const db = new Database(DB_PATH);
  
  try {
    const stmt = db.prepare(`
      UPDATE ad_materials 
      SET thumbnail_count = (
        SELECT COUNT(*) FROM thumbnails WHERE video_id = ?
      ),
      primary_thumbnail_id = (
        SELECT id FROM thumbnails WHERE video_id = ? AND is_primary = 1 LIMIT 1
      )
      WHERE video_id = ?
    `);
    
    stmt.run(videoId, videoId, videoId);
  } finally {
    db.close();
  }
}