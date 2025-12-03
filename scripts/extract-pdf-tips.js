import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdf from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDF_PATH = path.join(__dirname, '../裏技(Ad tips).pdf');
const OUTPUT_PATH = path.join(__dirname, '../data/extracted-tips.json');

// サイト名マッピング（正規化用）
const SITE_MAPPING = {
  'カリビアンコム': { db_name: 'caribbean', category: 'premium' },
  '一本道': { db_name: 'ippondo', category: 'premium' },
  '天然むすめ': { db_name: 'tennen_musume', category: 'premium' },
  'HEYZO': { db_name: 'heyzo', category: 'premium' },
  'パコパコママ': { db_name: 'pacopacomama', category: 'premium' },
  'ムラムラってくる素人': { db_name: 'muramura', category: 'premium' },
  'おんなのこのしくみ': { db_name: 'onna_no_ko', category: 'premium' },
  'Japorno': { db_name: 'japorno', category: 'premium' },
  '10musume': { db_name: 'tenmusume', category: 'premium' },
  'FC2': { db_name: 'fc2', category: 'amateur' },
  'MGS動画': { db_name: 'mgs', category: 'studio' },
  'FANZA': { db_name: 'fanza', category: 'studio' },
  'U-NEXT': { db_name: 'unext', category: 'streaming' },
  'Pornhub': { db_name: 'pornhub', category: 'tube' },
  'XVIDEOS': { db_name: 'xvideos', category: 'tube' },
};

/**
 * PDFファイルからテキストを抽出し、構造化データに変換
 */
async function extractPdfContent() {
  try {
    console.log('📄 PDF読み込み開始...');
    
    // PDFファイルの存在確認
    if (!fs.existsSync(PDF_PATH)) {
      throw new Error(`PDFファイルが見つかりません: ${PDF_PATH}`);
    }

    // PDFバイナリ読み込み
    const pdfBuffer = fs.readFileSync(PDF_PATH);
    
    // PDF解析
    const data = await pdf(pdfBuffer);
    
    console.log(`📊 PDF情報:`);
    console.log(`  - ページ数: ${data.numpages}`);
    console.log(`  - 総文字数: ${data.text.length}`);
    
    // テキストをページ別に分割（簡易実装）
    const pages = splitIntoPages(data.text, data.numpages);
    
    // 各ページから情報抽出
    const extractedTips = [];
    
    for (let i = 0; i < pages.length; i++) {
      const pageContent = pages[i];
      const pageNumber = i + 1;
      
      console.log(`📋 ページ ${pageNumber} を解析中...`);
      
      // サイト情報抽出
      const siteInfo = extractSiteInfo(pageContent, pageNumber);
      
      if (siteInfo) {
        extractedTips.push(siteInfo);
        console.log(`  ✅ ${siteInfo.site_name} の情報を抽出`);
      } else {
        console.log(`  ❌ ページ ${pageNumber}: 有効なサイト情報が見つかりませんでした`);
      }
    }

    // JSON出力
    const outputData = {
      extraction_date: new Date().toISOString(),
      pdf_info: {
        pages: data.numpages,
        total_chars: data.text.length
      },
      site_tips: extractedTips
    };

    // 出力ディレクトリ作成
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // JSON保存
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2), 'utf8');
    
    console.log(`✅ 抽出完了: ${extractedTips.length}件のサイト情報`);
    console.log(`📁 出力先: ${OUTPUT_PATH}`);
    
    return outputData;

  } catch (error) {
    console.error('❌ PDF抽出エラー:', error.message);
    throw error;
  }
}

/**
 * PDFテキストをページ別に分割（簡易実装）
 */
function splitIntoPages(text, numPages) {
  // 実際のページ区切りが不明なため、文字数で均等分割
  const chars = text.length;
  const charsPerPage = Math.ceil(chars / numPages);
  
  const pages = [];
  for (let i = 0; i < numPages; i++) {
    const start = i * charsPerPage;
    const end = Math.min((i + 1) * charsPerPage, chars);
    pages.push(text.slice(start, end));
  }
  
  return pages;
}

/**
 * ページテキストからサイト情報を抽出
 */
function extractSiteInfo(pageText, pageNumber) {
  try {
    // サイト名の検出
    const siteName = detectSiteName(pageText);
    if (!siteName) return null;

    // URLパターン抽出
    const urlPattern = extractUrlPattern(pageText);
    
    // 埋め込み手法抽出
    const embedMethod = extractEmbedMethod(pageText);
    
    // 注釈・メモ抽出
    const notes = extractNotes(pageText);
    
    return {
      site_name: siteName,
      site_url: urlPattern,
      image_zip_url_pattern: urlPattern ? `${urlPattern}/images.zip` : null,
      embed_code_method: embedMethod,
      screenshot_path: null, // 画像抽出時に設定
      page_number: pageNumber,
      notes: notes,
      mapping_info: SITE_MAPPING[siteName] || null
    };

  } catch (error) {
    console.warn(`⚠️ ページ ${pageNumber} の解析中にエラー:`, error.message);
    return null;
  }
}

/**
 * サイト名を検出
 */
function detectSiteName(text) {
  // 既知のサイト名パターンを検索
  const siteNames = Object.keys(SITE_MAPPING);
  
  for (const siteName of siteNames) {
    if (text.includes(siteName)) {
      return siteName;
    }
  }
  
  // その他のパターン検出（URL基準など）
  const urlPatterns = [
    /https?:\/\/([^\/\s]+)/g,
    /www\.([^\/\s\.]+\.[^\/\s]+)/g
  ];
  
  for (const pattern of urlPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      // 最初にマッチしたドメインからサイト名を推測
      const url = matches[0];
      const domain = url.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
      
      if (domain && !domain.includes(' ')) {
        return domain;
      }
    }
  }
  
  return null;
}

/**
 * URLパターンを抽出
 */
function extractUrlPattern(text) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const matches = text.match(urlRegex);
  
  if (matches && matches.length > 0) {
    return matches[0].split(/[\s,\)]/)[0]; // 最初のURLの基本部分
  }
  
  return null;
}

/**
 * 埋め込み手法を抽出
 */
function extractEmbedMethod(text) {
  const methods = [
    'iframe', 'script', 'embed', 'object', 'video',
    '埋め込み', 'コード', 'タグ', 'HTML', 'JavaScript'
  ];
  
  for (const method of methods) {
    if (text.toLowerCase().includes(method.toLowerCase())) {
      return method;
    }
  }
  
  return 'unknown';
}

/**
 * 注釈・メモを抽出
 */
function extractNotes(text) {
  // 注意事項や特別な指示を抽出
  const notePatterns = [
    /注意[：:][^。\n]*/g,
    /※[^。\n]*/g,
    /メモ[：:][^。\n]*/g,
    /備考[：:][^。\n]*/g
  ];
  
  const notes = [];
  
  for (const pattern of notePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      notes.push(...matches);
    }
  }
  
  return notes.length > 0 ? notes.join('; ') : null;
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  extractPdfContent()
    .then(() => console.log('🎉 PDF抽出処理完了'))
    .catch(error => {
      console.error('💥 PDF抽出処理失敗:', error.message);
      process.exit(1);
    });
}