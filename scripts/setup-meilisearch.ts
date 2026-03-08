/**
 * Meilisearchインデックスのセットアップスクリプト
 *
 * videosインデックスを作成し、検索設定（searchableAttributes, filterableAttributes等）を適用する。
 * 初回セットアップ時、またはインデックス設定を変更したい場合に実行する。
 *
 * 使用方法:
 *   npx tsx scripts/setup-meilisearch.ts
 *
 * 必要な環境変数:
 *   MEILISEARCH_HOST - MeilisearchホストURL
 *   MEILISEARCH_ADMIN_API_KEY - 管理用APIキー
 */

import 'dotenv/config';
import {
  createAdminClient,
  VIDEOS_INDEX,
  VIDEOS_INDEX_SETTINGS,
} from '../src/lib/meilisearch.js';

async function setupIndex() {
  const client = createAdminClient();

  console.log('=== Meilisearch インデックスセットアップ ===');
  console.log(`ホスト: ${process.env.MEILISEARCH_HOST}`);

  // ヘルスチェック
  try {
    const health = await client.health();
    console.log(`ヘルスチェック: ${health.status}`);
  } catch {
    console.error('Meilisearchに接続できません。ホストとAPIキーを確認してください。');
    process.exit(1);
  }

  // インデックス作成（既に存在する場合はスキップ）
  console.log(`\nインデックス "${VIDEOS_INDEX}" を作成中...`);
  try {
    const task = await client.createIndex(VIDEOS_INDEX, { primaryKey: 'id' });
    console.log(`  タスク登録: taskUid=${task.taskUid}`);
    await client.tasks.waitForTask(task.taskUid);
    console.log('  インデックス作成完了');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'index_already_exists') {
      console.log('  インデックスは既に存在します（スキップ）');
    } else {
      throw error;
    }
  }

  // インデックス設定の適用
  const index = client.index(VIDEOS_INDEX);

  console.log('\n検索設定を適用中...');

  // searchableAttributes
  console.log('  searchableAttributes を設定中...');
  const searchableTask = await index.updateSearchableAttributes(
    VIDEOS_INDEX_SETTINGS.searchableAttributes as unknown as string[]
  );
  await client.tasks.waitForTask(searchableTask.taskUid);

  // filterableAttributes
  console.log('  filterableAttributes を設定中...');
  const filterableTask = await index.updateFilterableAttributes(
    VIDEOS_INDEX_SETTINGS.filterableAttributes as unknown as string[]
  );
  await client.tasks.waitForTask(filterableTask.taskUid);

  // sortableAttributes
  console.log('  sortableAttributes を設定中...');
  const sortableTask = await index.updateSortableAttributes(
    VIDEOS_INDEX_SETTINGS.sortableAttributes as unknown as string[]
  );
  await client.tasks.waitForTask(sortableTask.taskUid);

  // rankingRules
  console.log('  rankingRules を設定中...');
  const rankingTask = await index.updateRankingRules(
    VIDEOS_INDEX_SETTINGS.rankingRules as unknown as string[]
  );
  await client.tasks.waitForTask(rankingTask.taskUid);

  // displayedAttributes
  console.log('  displayedAttributes を設定中...');
  const displayedTask = await index.updateDisplayedAttributes(
    VIDEOS_INDEX_SETTINGS.displayedAttributes as unknown as string[]
  );
  await client.tasks.waitForTask(displayedTask.taskUid);

  // localizedAttributes（日本語形態素解析 - Lindera tokenizer）
  console.log('  localizedAttributes を設定中（日本語形態素解析）...');
  const localizedTask = await index.updateLocalizedAttributes(
    VIDEOS_INDEX_SETTINGS.localizedAttributes as unknown as Array<{ locales: string[]; attributePatterns: string[] }>
  );
  await client.tasks.waitForTask(localizedTask.taskUid);

  // typoTolerance（CJKテキスト向け調整）
  console.log('  typoTolerance を設定中...');
  const typoTask = await index.updateTypoTolerance(
    VIDEOS_INDEX_SETTINGS.typoTolerance as unknown as { disableOnAttributes: string[] }
  );
  await client.tasks.waitForTask(typoTask.taskUid);

  // pagination（大規模データセット対応）
  console.log('  pagination を設定中...');
  const paginationTask = await index.updatePagination(
    VIDEOS_INDEX_SETTINGS.pagination as unknown as { maxTotalHits: number }
  );
  await client.tasks.waitForTask(paginationTask.taskUid);

  // faceting（ファセット設定）
  console.log('  faceting を設定中...');
  const facetingTask = await index.updateFaceting(
    VIDEOS_INDEX_SETTINGS.faceting as unknown as { maxValuesPerFacet: number }
  );
  await client.tasks.waitForTask(facetingTask.taskUid);

  // 設定内容の確認
  console.log('\n=== 適用された設定 ===');
  const settings = await index.getSettings();
  console.log(JSON.stringify(settings, null, 2));

  // インデックス情報の確認
  const stats = await index.getStats();
  console.log('\n=== インデックス統計 ===');
  console.log(`  ドキュメント数: ${stats.numberOfDocuments}`);
  console.log(`  インデックス中: ${stats.isIndexing}`);

  console.log('\nセットアップ完了！');
}

setupIndex().catch((error) => {
  console.error('セットアップエラー:', error);
  process.exit(1);
});
