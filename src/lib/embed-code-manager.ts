/**
 * 埋め込みコード管理機能
 * 
 * 12サイトの埋め込みコード専用サイト向けの管理機能を提供
 */

import Database from 'better-sqlite3';
import path from 'path';
import { AD_SITES, type AdSiteConfig } from './ad-materials.js';

const DB_PATH = path.join(process.cwd(), 'data.db');

/**
 * 埋め込みコードのタイプ
 */
export type EmbedCodeType = 'iframe' | 'video' | 'object' | 'script' | 'custom';

/**
 * 埋め込みコード情報
 */
export interface EmbedCode {
  id?: number;
  videoId: string;
  siteId: string;
  embedType: EmbedCodeType;
  embedCode: string;
  isActive: boolean;
  width?: number;
  height?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 埋め込みコード専用サイトの一覧を取得
 */
export function getEmbedOnlySites(): AdSiteConfig[] {
  return AD_SITES.filter(site => !site.imageZipUrlPattern && site.hasEmbedCode);
}

/**
 * 埋め込みコード管理用テーブルを初期化
 */
export function initializeEmbedCodeTables(): void {
  const db = new Database(DB_PATH);
  
  try {
    // 埋め込みコードテーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS embed_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT NOT NULL,
        site_id TEXT NOT NULL,
        embed_type TEXT NOT NULL DEFAULT 'iframe',
        embed_code TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        width INTEGER,
        height INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(video_id, site_id)
      )
    `);

    // インデックスを作成
    db.exec('CREATE INDEX IF NOT EXISTS idx_embed_codes_video_id ON embed_codes(video_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_embed_codes_site_id ON embed_codes(site_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_embed_codes_is_active ON embed_codes(is_active)');
    
    console.log('✅ 埋め込みコード管理テーブルを初期化しました');
  } finally {
    db.close();
  }
}

/**
 * 埋め込みコードを保存する
 */
export function saveEmbedCode(embedCode: Omit<EmbedCode, 'id' | 'createdAt' | 'updatedAt'>): number {
  const db = new Database(DB_PATH);
  
  try {
    initializeEmbedCodeTables();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO embed_codes (
        video_id, site_id, embed_type, embed_code, is_active, width, height, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(
      embedCode.videoId,
      embedCode.siteId,
      embedCode.embedType,
      embedCode.embedCode,
      embedCode.isActive ? 1 : 0,
      embedCode.width || null,
      embedCode.height || null
    );

    return result.lastInsertRowid as number;
  } finally {
    db.close();
  }
}

/**
 * 動画IDによる埋め込みコードの取得
 */
export function getEmbedCodesByVideoId(videoId: string): EmbedCode[] {
  const db = new Database(DB_PATH);
  
  try {
    initializeEmbedCodeTables();

    const stmt = db.prepare(`
      SELECT 
        id, video_id, site_id, embed_type, embed_code, 
        is_active, width, height, created_at, updated_at
      FROM embed_codes
      WHERE video_id = ? AND is_active = 1
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(videoId) as Record<string, unknown>[];
    
    return rows.map(row => ({
      id: row.id as number,
      videoId: row.video_id as string,
      siteId: row.site_id as string,
      embedType: row.embed_type as EmbedCodeType,
      embedCode: row.embed_code as string,
      isActive: row.is_active === 1,
      width: row.width as number | undefined,
      height: row.height as number | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    }));
  } finally {
    db.close();
  }
}

/**
 * サイトIDと動画IDによる埋め込みコードの取得
 */
export function getEmbedCode(videoId: string, siteId: string): EmbedCode | null {
  const db = new Database(DB_PATH);
  
  try {
    initializeEmbedCodeTables();

    const stmt = db.prepare(`
      SELECT 
        id, video_id, site_id, embed_type, embed_code, 
        is_active, width, height, created_at, updated_at
      FROM embed_codes
      WHERE video_id = ? AND site_id = ? AND is_active = 1
    `);

    const row = stmt.get(videoId, siteId) as Record<string, unknown> | undefined;
    
    if (!row) return null;

    return {
      id: row.id as number,
      videoId: row.video_id as string,
      siteId: row.site_id as string,
      embedType: row.embed_type as EmbedCodeType,
      embedCode: row.embed_code as string,
      isActive: row.is_active === 1,
      width: row.width as number | undefined,
      height: row.height as number | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    };
  } finally {
    db.close();
  }
}

/**
 * 埋め込みコードを無効化する
 */
export function deactivateEmbedCode(videoId: string, siteId: string): boolean {
  const db = new Database(DB_PATH);
  
  try {
    initializeEmbedCodeTables();

    const stmt = db.prepare(`
      UPDATE embed_codes 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE video_id = ? AND site_id = ?
    `);

    const result = stmt.run(videoId, siteId);
    return result.changes > 0;
  } finally {
    db.close();
  }
}

/**
 * 埋め込みコードのタイプを自動判定する
 */
export function detectEmbedCodeType(embedCode: string): EmbedCodeType {
  const code = embedCode.toLowerCase().trim();
  
  if (code.includes('<iframe')) {
    return 'iframe';
  } else if (code.includes('<video') || code.includes('<source')) {
    return 'video';
  } else if (code.includes('<object') || code.includes('<embed')) {
    return 'object';
  } else if (code.includes('<script')) {
    return 'script';
  } else {
    return 'custom';
  }
}

/**
 * 埋め込みコードからwidth/heightを抽出する
 */
export function extractDimensions(embedCode: string): { width?: number; height?: number } {
  const widthMatch = embedCode.match(/width\s*[=:]\s*['""]?(\d+)['""]?/i);
  const heightMatch = embedCode.match(/height\s*[=:]\s*['""]?(\d+)['""]?/i);
  
  return {
    width: widthMatch ? parseInt(widthMatch[1], 10) : undefined,
    height: heightMatch ? parseInt(heightMatch[1], 10) : undefined
  };
}

/**
 * 埋め込みコードの完全なワークフロー（解析・保存）
 */
export function processEmbedCode(
  videoId: string,
  siteId: string,
  rawEmbedCode: string,
  options: {
    isActive?: boolean;
    overrideDimensions?: { width?: number; height?: number };
  } = {}
): {
  success: boolean;
  embedCodeId?: number;
  embedType?: EmbedCodeType;
  dimensions?: { width?: number; height?: number };
  error?: string;
} {
  try {
    // サイトIDが有効かチェック
    const site = AD_SITES.find(s => s.id === siteId);
    if (!site) {
      return { success: false, error: `無効なサイトID: ${siteId}` };
    }

    // 埋め込みコードが空でないかチェック
    if (!rawEmbedCode || rawEmbedCode.trim().length === 0) {
      return { success: false, error: '埋め込みコードが空です' };
    }

    // 埋め込みタイプを自動判定
    const embedType = detectEmbedCodeType(rawEmbedCode);
    
    // 寸法を抽出（オーバーライドが指定されていない場合）
    const autoDimensions = extractDimensions(rawEmbedCode);
    const finalDimensions = {
      width: options.overrideDimensions?.width || autoDimensions.width,
      height: options.overrideDimensions?.height || autoDimensions.height
    };

    // データベースに保存
    const embedCodeId = saveEmbedCode({
      videoId,
      siteId,
      embedType,
      embedCode: rawEmbedCode.trim(),
      isActive: options.isActive !== false, // デフォルトはtrue
      width: finalDimensions.width,
      height: finalDimensions.height
    });

    return {
      success: true,
      embedCodeId,
      embedType,
      dimensions: finalDimensions
    };
  } catch (error) {
    console.error('埋め込みコード処理エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

/**
 * 動画の全埋め込みコード統計情報を取得
 */
export function getEmbedCodeStats(): {
  totalEmbedCodes: number;
  activeEmbedCodes: number;
  embedCodesByType: Record<EmbedCodeType, number>;
  embedCodesBySite: Record<string, number>;
} {
  const db = new Database(DB_PATH);
  
  try {
    initializeEmbedCodeTables();

    // 総数と有効数
    const totalResult = db.prepare('SELECT COUNT(*) as count FROM embed_codes').get() as { count: number };
    const activeResult = db.prepare('SELECT COUNT(*) as count FROM embed_codes WHERE is_active = 1').get() as { count: number };

    // タイプ別統計
    const typeResults = db.prepare(`
      SELECT embed_type, COUNT(*) as count 
      FROM embed_codes 
      WHERE is_active = 1 
      GROUP BY embed_type
    `).all() as { embed_type: string; count: number }[];

    // サイト別統計
    const siteResults = db.prepare(`
      SELECT site_id, COUNT(*) as count 
      FROM embed_codes 
      WHERE is_active = 1 
      GROUP BY site_id
    `).all() as { site_id: string; count: number }[];

    const embedCodesByType: Record<EmbedCodeType, number> = {
      iframe: 0,
      video: 0,
      object: 0,
      script: 0,
      custom: 0
    };

    typeResults.forEach(row => {
      embedCodesByType[row.embed_type as EmbedCodeType] = row.count;
    });

    const embedCodesBySite: Record<string, number> = {};
    siteResults.forEach(row => {
      embedCodesBySite[row.site_id] = row.count;
    });

    return {
      totalEmbedCodes: totalResult.count,
      activeEmbedCodes: activeResult.count,
      embedCodesByType,
      embedCodesBySite
    };
  } finally {
    db.close();
  }
}

/**
 * サポートされている埋め込み専用サイトの一覧表示
 */
export function listEmbedOnlySitesInfo(): void {
  const embedOnlySites = getEmbedOnlySites();
  
  console.log('\n🎬 埋め込みコード専用サイト一覧:');
  console.log(`📊 総数: ${embedOnlySites.length} サイト\n`);
  
  embedOnlySites.forEach((site, index) => {
    console.log(`${index + 1}. **${site.siteName}** (${site.id})`);
    console.log(`   URL: ${site.siteUrl}`);
    console.log(`   備考: ${site.notes || 'なし'}\n`);
  });
}