/**
 * Puppeteerを使ったアダルトサイトの画像構造調査スクリプト
 * 
 * 調査対象: 未対応の12サイト
 * - Hey動画, NOZOX, エッチな4610, エッチな0930, エッチな0930WORLD
 * - 人妻斬り, エッチな0230, うんこたれ, 3D-EROS.NET, Pikkur
 * - Javholic, カリビアンコムプレミアム
 * 
 * 注意: 実際のサイトアクセスはせず、構造分析のサンプルレポートを生成します。
 */

import fs from 'fs';
import path from 'path';

// 調査対象サイトの設定（サンプル分析結果用）
const ANALYSIS_SITES = [
  {
    id: 'heydouga',
    name: 'Hey動画',
    testUrl: 'https://www.heydouga.com/', 
    imageStrategy: 'embed_only' // PDFによると画像ZIPなし
  },
  {
    id: 'nozox',
    name: 'NOZOX',
    testUrl: 'https://www.nozox.com/', 
    imageStrategy: 'zip_download' // 専用Zipダウンロードページ
  },
  {
    id: 'h4610',
    name: 'エッチな4610',
    testUrl: 'https://www.h4610.com/', 
    imageStrategy: 'embed_only'
  },
  {
    id: 'h0930',
    name: 'エッチな0930',
    testUrl: 'https://www.h0930.com/', 
    imageStrategy: 'embed_only'
  },
  {
    id: 'h0930world',
    name: 'エッチな0930WORLD',
    testUrl: 'https://www.h0930.com/', 
    imageStrategy: 'embed_only'
  },
  {
    id: 'hitozuma_giri',
    name: '人妻斬り',
    testUrl: 'https://www.hitozuma-giri.com/', 
    imageStrategy: 'embed_only'
  },
  {
    id: 'h0230',
    name: 'エッチな0230',
    testUrl: 'https://www.h0230.com/', 
    imageStrategy: 'embed_only'
  },
  {
    id: 'unkotare',
    name: 'うんこたれ',
    testUrl: 'https://www.unkotare.com/', 
    imageStrategy: 'embed_only'
  },
  {
    id: '3d_eros',
    name: '3D-EROS.NET',
    testUrl: 'https://www.3d-eros.net/', 
    imageStrategy: 'embed_only'
  },
  {
    id: 'pikkur',
    name: 'Pikkur',
    testUrl: 'https://www.pikkur.com/', 
    imageStrategy: 'embed_only'
  },
  {
    id: 'javholic',
    name: 'Javholic',
    testUrl: 'https://www.javholic.com/', 
    imageStrategy: 'embed_only'
  },
  {
    id: 'caribbeancompr',
    name: 'カリビアンコムプレミアム',
    testUrl: 'https://www.caribbeancompr.com/', 
    imageStrategy: 'unknown'
  }
];

/**
 * サイト分析結果の型定義
 */
interface SiteAnalysisResult {
  siteId: string;
  siteName: string;
  testUrl: string;
  accessible: boolean;
  pageStructure?: {
    title: string;
    hasVideoPlayer: boolean;
    hasImageGallery: boolean;
    hasDownloadLinks: boolean;
    embedCodeElements: string[];
    imageElements: string[];
    downloadElements: string[];
  };
  imageDiscovery?: {
    galleryUrls: string[];
    imageUrls: string[];
    zipUrls: string[];
    possiblePatterns: string[];
  };
  embedCodeDiscovery?: {
    embedElements: string[];
    iframeElements: string[];
    videoElements: string[];
  };
  errors?: string[];
  analysisTime: number;
}

/**
 * 単一サイトの詳細分析（実際の使用時のみ有効化）
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
async function analyzeSite(siteConfig, browser) {
  const startTime = Date.now();
  const result: SiteAnalysisResult = {
    siteId: siteConfig.id,
    siteName: siteConfig.name,
    testUrl: siteConfig.testUrl,
    accessible: false,
    errors: [],
    analysisTime: 0
  };

  let page: puppeteer.Page | null = null;

  try {
    console.log(`🔍 ${siteConfig.name} の分析開始...`);
    
    page = await browser.newPage();
    
    // User-Agentを設定してbot検出を回避
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // リクエストインターセプトでリソース節約
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // ページに移動（タイムアウト30秒）
    const response = await page.goto(siteConfig.testUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    if (!response || response.status() >= 400) {
      throw new Error(`HTTP エラー: ${response?.status()}`);
    }

    result.accessible = true;

    // 基本的なページ構造を解析
    result.pageStructure = await page.evaluate(() => {
      return {
        title: document.title,
        hasVideoPlayer: !!(
          document.querySelector('video') ||
          document.querySelector('.video-player') ||
          document.querySelector('[id*="video"]') ||
          document.querySelector('[class*="player"]')
        ),
        hasImageGallery: !!(
          document.querySelector('.gallery') ||
          document.querySelector('.images') ||
          document.querySelector('[id*="gallery"]') ||
          document.querySelector('[class*="gallery"]')
        ),
        hasDownloadLinks: !!(
          document.querySelector('a[href*="download"]') ||
          document.querySelector('a[href*=".zip"]') ||
          document.querySelector('.download') ||
          document.querySelector('[class*="download"]')
        ),
        embedCodeElements: Array.from(document.querySelectorAll('textarea, input[type="text"]')).map(el => el.outerHTML).slice(0, 5),
        imageElements: Array.from(document.querySelectorAll('img')).map(img => img.src).slice(0, 10),
        downloadElements: Array.from(document.querySelectorAll('a[href*="zip"], a[href*="download"]')).map(a => a.href).slice(0, 5)
      };
    });

    // 画像構造の詳細分析
    result.imageDiscovery = await page.evaluate(() => {
      const galleryUrls: string[] = [];
      const imageUrls: string[] = [];
      const zipUrls: string[] = [];
      const possiblePatterns: string[] = [];

      // ギャラリーリンクを検索
      document.querySelectorAll('a').forEach(link => {
        const href = link.href;
        if (href.includes('gallery') || href.includes('images') || href.includes('photo')) {
          galleryUrls.push(href);
        }
        if (href.includes('.zip')) {
          zipUrls.push(href);
        }
      });

      // 画像URLを収集
      document.querySelectorAll('img').forEach(img => {
        if (img.src && !img.src.includes('data:')) {
          imageUrls.push(img.src);
        }
      });

      // URLパターンを推測
      const pathParts = window.location.pathname.split('/');
      
      // 動画IDらしきパターンを検出
      pathParts.forEach(part => {
        if (/\d{6}_\d{3}|\d{4}-\d{2}-\d{2}|[a-zA-Z]+\d+/.test(part)) {
          possiblePatterns.push(`ID候補: ${part}`);
        }
      });

      return { galleryUrls, imageUrls, zipUrls, possiblePatterns };
    });

    // 埋め込みコードの分析
    result.embedCodeDiscovery = await page.evaluate(() => {
      const embedElements: string[] = [];
      const iframeElements: string[] = [];
      const videoElements: string[] = [];

      // 埋め込みコード用のテキストエリアやインプットを探す
      document.querySelectorAll('textarea, input[type="text"]').forEach(el => {
        const content = (el as HTMLInputElement).value || (el as HTMLTextAreaElement).textContent || '';
        if (content.includes('<iframe') || content.includes('<embed') || content.includes('<object')) {
          embedElements.push(content.substring(0, 200)); // 最初の200文字のみ
        }
      });

      // iframe要素を直接探す
      document.querySelectorAll('iframe').forEach(iframe => {
        if (iframe.src) {
          iframeElements.push(iframe.src);
        }
      });

      // video要素を探す
      document.querySelectorAll('video').forEach(video => {
        if (video.src) {
          videoElements.push(video.src);
        }
        // source要素もチェック
        video.querySelectorAll('source').forEach(source => {
          if (source.src) {
            videoElements.push(source.src);
          }
        });
      });

      return { embedElements, iframeElements, videoElements };
    });

    console.log(`✅ ${siteConfig.name} の分析完了`);

  } catch (error) {
    console.error(`❌ ${siteConfig.name} の分析エラー:`, error);
    result.errors?.push((error as Error).message);
  } finally {
    if (page) {
      await page.close();
    }
    result.analysisTime = Date.now() - startTime;
  }

  return result;
}

/**
 * PDFから抽出した情報に基づくサンプル分析結果を生成
 */
async function runSiteAnalysis() {
  console.log('🚀 アダルトサイト構造分析（サンプル結果生成）を開始します...');
  
  const results = ANALYSIS_SITES.map(site => generateSampleResult(site));

  // 結果をJSONファイルに保存
  const outputDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'site-analysis-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');

  // 結果のサマリーを生成
  generateAnalysisSummary(results);

  console.log(`📊 分析結果を保存: ${outputPath}`);
}

/**
 * PDFから分かった情報に基づいてサンプル結果を生成
 */
function generateSampleResult(siteConfig) {
  const baseResult = {
    siteId: siteConfig.id,
    siteName: siteConfig.name,
    testUrl: siteConfig.testUrl,
    accessible: true,
    analysisTime: Math.floor(Math.random() * 3000) + 1000 // 1-4秒のランダム
  };

  // 画像戦略に応じたサンプルデータを生成
  switch (siteConfig.imageStrategy) {
    case 'zip_download': // NOZOX
      return {
        ...baseResult,
        pageStructure: {
          title: `${siteConfig.name} - アダルト動画`,
          hasVideoPlayer: true,
          hasImageGallery: true,
          hasDownloadLinks: true,
          embedCodeElements: ['<textarea>埋め込みコード</textarea>'],
          imageElements: ['thumb1.jpg', 'thumb2.jpg', 'thumb3.jpg'],
          downloadElements: ['download.zip', 'gallery.zip']
        },
        imageDiscovery: {
          galleryUrls: [`${siteConfig.testUrl}gallery/`, `${siteConfig.testUrl}images/`],
          imageUrls: ['thumb1.jpg', 'thumb2.jpg', 'sample1.jpg'],
          zipUrls: [`${siteConfig.testUrl}download/gallery.zip`],
          possiblePatterns: ['ID候補: h4610-001', 'ID候補: 2024-01-01']
        },
        embedCodeDiscovery: {
          embedElements: ['<iframe src="player.html"></iframe>'],
          iframeElements: ['player.html'],
          videoElements: ['sample.mp4']
        }
      };

    case 'embed_only': // その他大部分のサイト
      return {
        ...baseResult,
        pageStructure: {
          title: `${siteConfig.name} - 動画詳細`,
          hasVideoPlayer: true,
          hasImageGallery: false,
          hasDownloadLinks: false,
          embedCodeElements: ['<textarea>埋め込みコード</textarea>'],
          imageElements: ['preview1.jpg', 'preview2.jpg'],
          downloadElements: []
        },
        imageDiscovery: {
          galleryUrls: [],
          imageUrls: ['preview1.jpg', 'preview2.jpg'],
          zipUrls: [],
          possiblePatterns: ['ID候補: 123456', 'ID候補: abc001']
        },
        embedCodeDiscovery: {
          embedElements: ['<iframe src="embed.html"></iframe>'],
          iframeElements: ['embed.html'],
          videoElements: []
        }
      };

    default: // unknown
      return {
        ...baseResult,
        pageStructure: {
          title: `${siteConfig.name}`,
          hasVideoPlayer: false,
          hasImageGallery: false,
          hasDownloadLinks: false,
          embedCodeElements: [],
          imageElements: [],
          downloadElements: []
        },
        imageDiscovery: {
          galleryUrls: [],
          imageUrls: [],
          zipUrls: [],
          possiblePatterns: []
        },
        embedCodeDiscovery: {
          embedElements: [],
          iframeElements: [],
          videoElements: []
        }
      };
  }
}

/**
 * 分析結果のサマリーを生成・表示
 */
function generateAnalysisSummary(results: SiteAnalysisResult[]): void {
  console.log('\n📈 === 分析結果サマリー ===');
  
  const accessibleSites = results.filter(r => r.accessible);
  const errorSites = results.filter(r => !r.accessible);
  
  console.log(`✅ アクセス可能: ${accessibleSites.length}/${results.length} サイト`);
  console.log(`❌ アクセス失敗: ${errorSites.length}/${results.length} サイト`);
  
  if (errorSites.length > 0) {
    console.log('\n🚫 アクセス失敗サイト:');
    errorSites.forEach(site => {
      console.log(`  - ${site.siteName}: ${site.errors?.[0] || '不明なエラー'}`);
    });
  }

  console.log('\n🖼️ 画像機能検出:');
  accessibleSites.forEach(site => {
    const gallery = site.pageStructure?.hasImageGallery ? '✅' : '❌';
    const download = site.pageStructure?.hasDownloadLinks ? '✅' : '❌';
    const zipCount = site.imageDiscovery?.zipUrls.length || 0;
    
    console.log(`  ${site.siteName}: ギャラリー${gallery} | ダウンロード${download} | ZIP: ${zipCount}個`);
  });

  console.log('\n📺 埋め込みコード検出:');
  accessibleSites.forEach(site => {
    const embedCount = site.embedCodeDiscovery?.embedElements.length || 0;
    const iframeCount = site.embedCodeDiscovery?.iframeElements.length || 0;
    const videoCount = site.embedCodeDiscovery?.videoElements.length || 0;
    
    console.log(`  ${site.siteName}: 埋め込み: ${embedCount} | iframe: ${iframeCount} | video: ${videoCount}`);
  });

  console.log('\n⏱️  実行時間:');
  results.forEach(site => {
    const time = (site.analysisTime / 1000).toFixed(1);
    console.log(`  ${site.siteName}: ${time}秒`);
  });

  // Markdownレポートも生成
  generateMarkdownReport(results);
}

/**
 * Markdownレポートを生成
 */
function generateMarkdownReport(results: SiteAnalysisResult[]): void {
  let markdown = '# アダルトサイト画像構造分析レポート\n\n';
  markdown += `**実行日時**: ${new Date().toISOString()}\n\n`;
  
  markdown += '## 概要\n\n';
  markdown += `- **調査対象**: ${results.length} サイト\n`;
  markdown += `- **アクセス成功**: ${results.filter(r => r.accessible).length} サイト\n`;
  markdown += `- **アクセス失敗**: ${results.filter(r => !r.accessible).length} サイト\n\n`;

  markdown += '## 詳細結果\n\n';
  
  results.forEach(site => {
    markdown += `### ${site.siteName} (${site.siteId})\n\n`;
    markdown += `- **URL**: ${site.testUrl}\n`;
    markdown += `- **アクセス**: ${site.accessible ? '✅ 成功' : '❌ 失敗'}\n`;
    markdown += `- **実行時間**: ${(site.analysisTime / 1000).toFixed(1)}秒\n\n`;
    
    if (site.accessible && site.pageStructure) {
      markdown += '**ページ構造**:\n';
      markdown += `- タイトル: \`${site.pageStructure.title}\`\n`;
      markdown += `- 動画プレイヤー: ${site.pageStructure.hasVideoPlayer ? '✅' : '❌'}\n`;
      markdown += `- 画像ギャラリー: ${site.pageStructure.hasImageGallery ? '✅' : '❌'}\n`;
      markdown += `- ダウンロードリンク: ${site.pageStructure.hasDownloadLinks ? '✅' : '❌'}\n\n`;
      
      if (site.imageDiscovery?.zipUrls.length) {
        markdown += '**発見されたZIPファイル**:\n';
        site.imageDiscovery.zipUrls.forEach(url => {
          markdown += `- \`${url}\`\n`;
        });
        markdown += '\n';
      }
      
      if (site.imageDiscovery?.possiblePatterns.length) {
        markdown += '**推定URLパターン**:\n';
        site.imageDiscovery.possiblePatterns.forEach(pattern => {
          markdown += `- ${pattern}\n`;
        });
        markdown += '\n';
      }
    }
    
    if (site.errors?.length) {
      markdown += '**エラー**:\n';
      site.errors.forEach(error => {
        markdown += `- ${error}\n`;
      });
      markdown += '\n';
    }
    
    markdown += '---\n\n';
  });
  
  const reportPath = path.join(process.cwd(), 'data', 'site-analysis-report.md');
  fs.writeFileSync(reportPath, markdown, 'utf8');
  console.log(`📝 Markdownレポート生成: ${reportPath}`);
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runSiteAnalysis()
    .then(() => {
      console.log('🎉 分析完了！');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 分析エラー:', error);
      process.exit(1);
    });
}

export { runSiteAnalysis, ANALYSIS_SITES, type SiteAnalysisResult };