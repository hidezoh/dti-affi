import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { convert } from 'pdf2pic';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDF_PATH = path.join(__dirname, '../裏技(Ad tips).pdf');
const SCREENSHOTS_DIR = path.join(__dirname, '../public/images/ad-tips/screenshots');
const GUIDES_DIR = path.join(__dirname, '../public/images/ad-tips/guides');

/**
 * PDFから画像を抽出し、最適化して保存
 */
async function extractPdfImages() {
  try {
    console.log('🖼️ PDF画像抽出開始...');
    
    // PDFファイルの存在確認
    if (!fs.existsSync(PDF_PATH)) {
      throw new Error(`PDFファイルが見つかりません: ${PDF_PATH}`);
    }

    // 出力ディレクトリ作成
    [SCREENSHOTS_DIR, GUIDES_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 ディレクトリ作成: ${dir}`);
      }
    });

    // PDF→画像変換設定
    const convertOptions = {
      density: 300,           // 300dpi
      saveFilename: 'page',
      savePath: SCREENSHOTS_DIR,
      format: 'png',
      width: 1200,            // 最大幅1200px
      height: 1600           // 最大高さ1600px
    };

    console.log('⚙️ 変換設定:', convertOptions);

    // PDF→画像変換実行
    const convertInstance = convert(PDF_PATH, convertOptions);
    
    // すべてのページを変換
    const results = await convertInstance.bulk(-1, { responseType: 'image' });
    
    console.log(`📄 ${results.length} ページの画像を抽出`);

    // 各画像を最適化して保存
    const processedImages = [];
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const pageNumber = i + 1;
      
      console.log(`🔄 ページ ${pageNumber} を処理中...`);
      
      try {
        // 画像タイプを判定（簡易実装）
        const imageType = determineImageType(pageNumber);
        const targetDir = imageType === 'screenshot' ? SCREENSHOTS_DIR : GUIDES_DIR;
        
        // ファイル名生成
        const filename = `page_${pageNumber.toString().padStart(2, '0')}_${imageType}.jpg`;
        const outputPath = path.join(targetDir, filename);
        
        // Sharp で最適化
        await sharp(result.buffer)
          .resize(1200, null, {
            withoutEnlargement: true,
            fit: 'inside'
          })
          .jpeg({
            quality: 85,
            progressive: true
          })
          .toFile(outputPath);
        
        const stats = fs.statSync(outputPath);
        
        processedImages.push({
          page_number: pageNumber,
          image_type: imageType,
          file_path: path.relative(path.join(__dirname, '../public'), outputPath),
          file_size: stats.size,
          output_path: outputPath
        });
        
        console.log(`  ✅ 保存完了: ${filename} (${(stats.size / 1024).toFixed(1)}KB)`);
        
      } catch (error) {
        console.error(`  ❌ ページ ${pageNumber} 処理エラー:`, error.message);
      }
    }

    // 結果をJSON保存
    const resultData = {
      extraction_date: new Date().toISOString(),
      pdf_path: PDF_PATH,
      total_pages: results.length,
      processed_images: processedImages.length,
      images: processedImages
    };

    const resultPath = path.join(__dirname, '../data/extracted-images.json');
    fs.writeFileSync(resultPath, JSON.stringify(resultData, null, 2), 'utf8');
    
    console.log(`✅ 画像抽出完了: ${processedImages.length}/${results.length} 画像を処理`);
    console.log(`📁 結果保存先: ${resultPath}`);
    
    // 統計情報表示
    const totalSize = processedImages.reduce((sum, img) => sum + img.file_size, 0);
    const screenshotCount = processedImages.filter(img => img.image_type === 'screenshot').length;
    const guideCount = processedImages.filter(img => img.image_type === 'ui_guide').length;
    
    console.log(`📊 統計:`);
    console.log(`  - スクリーンショット: ${screenshotCount}枚`);
    console.log(`  - ガイド画像: ${guideCount}枚`);
    console.log(`  - 総容量: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    
    return resultData;

  } catch (error) {
    console.error('❌ 画像抽出エラー:', error.message);
    throw error;
  }
}

/**
 * ページ番号から画像タイプを判定（簡易実装）
 */
function determineImageType(pageNumber) {
  // 偶数ページをスクリーンショット、奇数ページをUIガイドとして分類
  // 実際の実装では、PDFの内容分析や設定ファイルに基づいて判定
  
  if (pageNumber % 2 === 0) {
    return 'screenshot';
  } else {
    return 'ui_guide';
  }
}

/**
 * 画像メタデータの取得（将来の機能拡張用）
 */
// async function getImageMetadata(imagePath) {
//   try {
//     const metadata = await sharp(imagePath).metadata();
//     return {
//       width: metadata.width,
//       height: metadata.height,
//       format: metadata.format,
//       size: fs.statSync(imagePath).size
//     };
//   } catch (error) {
//     console.warn(`⚠️ メタデータ取得エラー (${imagePath}):`, error.message);
//     return null;
//   }
// }

/**
 * 画像の重複チェック（将来の機能拡張用）
 */
// function checkDuplicateImages(targetDir) {
//   if (!fs.existsSync(targetDir)) return [];
//   
//   const existingFiles = fs.readdirSync(targetDir)
//     .filter(file => /\.(jpg|jpeg|png)$/i.test(file));
//   
//   console.log(`📋 既存画像ファイル: ${existingFiles.length}件`);
//   return existingFiles;
// }

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  extractPdfImages()
    .then(() => console.log('🎉 PDF画像抽出処理完了'))
    .catch(error => {
      console.error('💥 PDF画像抽出処理失敗:', error.message);
      process.exit(1);
    });
}