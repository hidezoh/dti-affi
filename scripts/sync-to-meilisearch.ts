/**
 * CSVデータをMeilisearchに同期するバッチスクリプト
 *
 * data/ディレクトリ内のCSVファイルを読み込み、Meilisearchのvideosインデックスに投入する。
 * 既存IDのドキュメントは更新、新規IDは追加される（addDocuments = upsert動作）。
 *
 * 使用方法:
 *   npx tsx scripts/sync-to-meilisearch.ts
 *
 * 必要な環境変数:
 *   MEILISEARCH_HOST - MeilisearchホストURL
 *   MEILISEARCH_ADMIN_API_KEY - 管理用APIキー
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import {
  createAdminClient,
  VIDEOS_INDEX,
  BATCH_SIZE,
  type Video,
} from '../src/lib/meilisearch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');

// CSVレコードの型
interface CsvRecord {
  movie_id?: string;
  site_id?: string;
  site_name?: string;
  title?: string;
  actress?: string;
  description?: string;
  release_date?: string;
  sample_url?: string;
  aff_link?: string;
  original_id?: string;
  sample_movie_url_2?: string;
  provider_name?: string;
}

async function syncToMeilisearch() {
  const client = createAdminClient();
  const index = client.index(VIDEOS_INDEX);

  console.log('=== Meilisearch データ同期 ===');
  console.log(`ホスト: ${process.env.MEILISEARCH_HOST}`);
  console.log(`データディレクトリ: ${DATA_DIR}`);

  // ヘルスチェック
  try {
    const health = await client.health();
    console.log(`ヘルスチェック: ${health.status}`);
  } catch {
    console.error('Meilisearchに接続できません。ホストとAPIキーを確認してください。');
    process.exit(1);
  }

  // CSVファイル一覧取得
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.csv'));
  if (files.length === 0) {
    console.log('CSVファイルが見つかりません。data/ディレクトリを確認してください。');
    process.exit(1);
  }
  console.log(`\nCSVファイル数: ${files.length}`);

  // 全CSVファイルからドキュメントを収集
  const allDocuments: Video[] = [];
  let skippedCount = 0;

  for (const file of files) {
    console.log(`  読み込み中: ${file}`);
    const content = fs.readFileSync(path.join(DATA_DIR, file));
    const records: CsvRecord[] = parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    });

    for (const record of records) {
      if (!record.movie_id) {
        skippedCount++;
        continue;
      }

      allDocuments.push({
        id: record.movie_id,
        site_id: record.site_id || '',
        site_name: record.site_name || '',
        title: record.title || '',
        actress: record.actress || '',
        description: record.description || '',
        release_date: record.release_date || '',
        sample_url: record.sample_url || '',
        aff_link: record.aff_link || '',
        original_id: record.original_id || '',
        sample_movie_url_2: record.sample_movie_url_2 || '',
        provider_name: record.provider_name || '',
      });
    }
  }

  console.log(`\n合計ドキュメント数: ${allDocuments.length}`);
  if (skippedCount > 0) {
    console.log(`スキップ数（movie_idなし）: ${skippedCount}`);
  }

  if (allDocuments.length === 0) {
    console.log('投入するドキュメントがありません。');
    process.exit(0);
  }

  // バッチ投入
  const totalBatches = Math.ceil(allDocuments.length / BATCH_SIZE);
  console.log(`\nバッチ投入開始（バッチサイズ: ${BATCH_SIZE}、バッチ数: ${totalBatches}）`);

  const taskUids: number[] = [];

  for (let i = 0; i < allDocuments.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = allDocuments.slice(i, i + BATCH_SIZE);

    console.log(`  バッチ ${batchNum}/${totalBatches}（${batch.length}件）...`);
    const task = await index.addDocuments(batch);
    taskUids.push(task.taskUid);
  }

  // 全タスクの完了を待つ
  console.log('\nインデックス処理の完了を待機中...');
  for (const taskUid of taskUids) {
    const result = await client.tasks.waitForTask(taskUid);
    if (result.status === 'failed') {
      console.error(`  タスク ${taskUid} が失敗: ${JSON.stringify(result.error)}`);
    }
  }

  // 結果確認
  const stats = await index.getStats();
  console.log('\n=== 同期結果 ===');
  console.log(`  ドキュメント数: ${stats.numberOfDocuments}`);
  console.log(`  インデックス中: ${stats.isIndexing}`);

  console.log('\n同期完了！');
}

syncToMeilisearch().catch((error) => {
  console.error('同期エラー:', error);
  process.exit(1);
});
