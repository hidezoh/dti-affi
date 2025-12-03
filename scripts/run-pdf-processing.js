import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * PDF処理の全工程を順次実行するメインスクリプト
 */
async function runPdfProcessing() {
  console.log('🚀 PDFデータ処理・データベース追加機能の実行開始');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  try {
    // ステップ1: データベーススキーマ作成
    await executeStep('📊 データベーススキーマ作成', './create-tips-schema.js');
    
    // PDFファイルの存在確認
    const pdfPath = path.join(__dirname, '../裏技(Ad tips).pdf');
    if (!fs.existsSync(pdfPath)) {
      console.log('⚠️ PDFファイルが見つかりません。テストデータで継続します。');
      await createTestData();
    } else {
      // ステップ2: PDF テキスト抽出
      await executeStep('📄 PDFテキスト抽出', './extract-pdf-tips.js');
      
      // ステップ3: PDF 画像抽出
      await executeStep('🖼️ PDF画像抽出', './extract-pdf-images.js');
    }
    
    // ステップ4: データベースインポート
    await executeStep('💾 データベースインポート', './import-tips-to-db.js');
    
    // 処理完了
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('='.repeat(60));
    console.log('✅ PDFデータ処理・データベース追加機能の実行完了');
    console.log(`⏱️ 総実行時間: ${duration}秒`);
    
    // 結果サマリー表示
    await displayResultSummary();
    
  } catch (error) {
    console.error('❌ 処理中にエラーが発生しました:', error.message);
    throw error;
  }
}

/**
 * 個別ステップの実行
 */
async function executeStep(stepName, scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 ${stepName}を開始...`);
    
    const fullPath = path.resolve(__dirname, scriptPath);
    const child = spawn('node', [fullPath], {
      stdio: 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });
    
    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${stepName}完了\n`);
        resolve({ stdout, stderr });
      } else {
        console.error(`❌ ${stepName}失敗 (終了コード: ${code})\n`);
        reject(new Error(`${stepName} failed with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      console.error(`💥 ${stepName}実行エラー:`, error.message);
      reject(error);
    });
  });
}

/**
 * テストデータの作成（PDFファイルが存在しない場合）
 */
async function createTestData() {
  console.log('📝 テストデータを作成中...');
  
  const testTipsData = {
    extraction_date: new Date().toISOString(),
    pdf_info: {
      pages: 4,
      total_chars: 2500
    },
    site_tips: [
      {
        site_name: 'カリビアンコム',
        site_url: 'https://www.caribbeancom.com',
        image_zip_url_pattern: 'https://www.caribbeancom.com/images.zip',
        embed_code_method: 'iframe',
        screenshot_path: null,
        page_number: 1,
        notes: 'プレミアム動画サイト、高画質コンテンツ',
        mapping_info: { db_name: 'caribbean', category: 'premium' }
      },
      {
        site_name: '一本道',
        site_url: 'https://www.1pondo.tv',
        image_zip_url_pattern: 'https://www.1pondo.tv/images.zip',
        embed_code_method: 'script',
        screenshot_path: null,
        page_number: 2,
        notes: '無修正プレミアムコンテンツ',
        mapping_info: { db_name: 'ippondo', category: 'premium' }
      },
      {
        site_name: 'HEYZO',
        site_url: 'https://www.heyzo.com',
        image_zip_url_pattern: 'https://www.heyzo.com/images.zip',
        embed_code_method: 'embed',
        screenshot_path: null,
        page_number: 3,
        notes: '多様なジャンルの動画コンテンツ',
        mapping_info: { db_name: 'heyzo', category: 'premium' }
      }
    ]
  };
  
  const testImagesData = {
    extraction_date: new Date().toISOString(),
    pdf_path: 'test_data',
    total_pages: 4,
    processed_images: 6,
    images: [
      {
        page_number: 1,
        image_type: 'screenshot',
        file_path: 'images/ad-tips/screenshots/page_01_screenshot.jpg',
        file_size: 85000
      },
      {
        page_number: 1,
        image_type: 'ui_guide',
        file_path: 'images/ad-tips/guides/page_01_ui_guide.jpg',
        file_size: 62000
      },
      {
        page_number: 2,
        image_type: 'screenshot',
        file_path: 'images/ad-tips/screenshots/page_02_screenshot.jpg',
        file_size: 91000
      },
      {
        page_number: 2,
        image_type: 'ui_guide',
        file_path: 'images/ad-tips/guides/page_02_ui_guide.jpg',
        file_size: 58000
      },
      {
        page_number: 3,
        image_type: 'screenshot',
        file_path: 'images/ad-tips/screenshots/page_03_screenshot.jpg',
        file_size: 88000
      },
      {
        page_number: 3,
        image_type: 'ui_guide',
        file_path: 'images/ad-tips/guides/page_03_ui_guide.jpg',
        file_size: 64000
      }
    ]
  };
  
  // データディレクトリ作成
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // テストデータ保存
  fs.writeFileSync(
    path.join(dataDir, 'extracted-tips.json'),
    JSON.stringify(testTipsData, null, 2),
    'utf8'
  );
  
  fs.writeFileSync(
    path.join(dataDir, 'extracted-images.json'),
    JSON.stringify(testImagesData, null, 2),
    'utf8'
  );
  
  console.log('✅ テストデータ作成完了');
}

/**
 * 処理結果のサマリー表示
 */
async function displayResultSummary() {
  try {
    console.log('\n📊 処理結果サマリー');
    console.log('-'.repeat(40));
    
    // データファイルの確認
    const tipsPath = path.join(__dirname, '../data/extracted-tips.json');
    const imagesPath = path.join(__dirname, '../data/extracted-images.json');
    
    if (fs.existsSync(tipsPath)) {
      const tipsData = JSON.parse(fs.readFileSync(tipsPath, 'utf8'));
      console.log(`📄 抽出されたサイト情報: ${tipsData.site_tips?.length || 0}件`);
    }
    
    if (fs.existsSync(imagesPath)) {
      const imagesData = JSON.parse(fs.readFileSync(imagesPath, 'utf8'));
      console.log(`🖼️ 抽出された画像: ${imagesData.images?.length || 0}件`);
    }
    
    // ディレクトリサイズの確認
    const screenshotsDir = path.join(__dirname, '../public/images/ad-tips/screenshots');
    const guidesDir = path.join(__dirname, '../public/images/ad-tips/guides');
    
    console.log(`📁 画像ディレクトリ:`);
    console.log(`  - スクリーンショット: ${countFiles(screenshotsDir)}ファイル`);
    console.log(`  - ガイド画像: ${countFiles(guidesDir)}ファイル`);
    
  } catch (error) {
    console.warn('⚠️ サマリー表示エラー:', error.message);
  }
}

/**
 * ディレクトリ内のファイル数をカウント
 */
function countFiles(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return 0;
    const files = fs.readdirSync(dirPath);
    return files.filter(file => !file.startsWith('.')).length;
  } catch {
    return 0;
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runPdfProcessing()
    .then(() => {
      console.log('\n🎉 全工程完了！');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 処理失敗:', error.message);
      process.exit(1);
    });
}