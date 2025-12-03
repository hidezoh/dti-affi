# PDFデータ処理・データベース追加機能

## 📋 概要
「裏技(Ad tips).pdf」から広告素材取得情報と画像を抽出し、SQLiteデータベースに構造化データとして格納する機能です。

## 🗄️ データベース設計

### 新規テーブル

#### 1. ad_tips テーブル
広告素材取得情報を管理
```sql
CREATE TABLE ad_tips (
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
```

#### 2. tip_images テーブル
画像ファイルを管理
```sql
CREATE TABLE tip_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad_tip_id INTEGER,
    image_type TEXT CHECK(image_type IN ('screenshot', 'ui_guide')),
    file_path TEXT NOT NULL,
    original_pdf_page INTEGER,
    caption TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ad_tip_id) REFERENCES ad_tips(id)
);
```

## 🛠️ 実装スクリプト

### 1. create-tips-schema.js
データベーススキーマの作成
- ad_tips、tip_imagesテーブルの作成
- インデックスの設定
- エラーハンドリング

### 2. extract-pdf-tips.js
PDFからテキスト情報を抽出
- pdf-parseを使用したテキスト解析
- サイト名、URL、手法の構造化
- JSONファイルとして出力

### 3. extract-pdf-images.js
PDFから画像を抽出・最適化
- pdf2picで300dpi画像抽出
- Sharpで最適化（1200px幅、JPEG 85%品質）
- screenshots/guidesディレクトリに分類保存

### 4. import-tips-to-db.js
抽出データをデータベースに投入
- トランザクション処理
- UPSERT処理（重複対応）
- バリデーションとサニタイズ
- エラーハンドリング

### 5. run-pdf-processing.js
全工程の統合実行
- 各スクリプトの順次実行
- テストデータ生成（PDFファイル未存在時）
- 処理結果サマリー表示

## 🚀 使用方法

### 基本実行
```bash
# 全工程を一括実行
node scripts/run-pdf-processing.js

# 個別実行
node scripts/create-tips-schema.js      # スキーマ作成
node scripts/extract-pdf-tips.js        # テキスト抽出
node scripts/extract-pdf-images.js      # 画像抽出
node scripts/import-tips-to-db.js       # DB投入
```

### 必要な環境
```bash
# 必要なパッケージ（package.jsonに追加済み）
npm install pdf-parse pdf2pic sharp
```

## 📁 ファイル構造

### 入力ファイル
```
/裏技(Ad tips).pdf    # 処理対象PDFファイル
```

### 出力構造
```
/data/
  ├── extracted-tips.json     # 抽出されたテキスト情報
  └── extracted-images.json   # 画像情報
  
/public/images/ad-tips/
  ├── screenshots/            # UIスクリーンショット
  └── guides/                # 操作ガイド画像
```

## 🔍 データフロー

1. **PDF解析** → PDFファイルからテキスト・画像を抽出
2. **構造化** → サイト情報をJSON形式で整理
3. **最適化** → 画像の圧縮・リサイズ処理
4. **投入** → SQLiteデータベースに格納
5. **検証** → データ整合性チェック

## 📊 サポートサイト

設定済みのサイトマッピング：
- カリビアンコム、一本道、天然むすめ
- HEYZO、パコパコママ、ムラムラってくる素人
- FC2、MGS動画、FANZA
- Pornhub、XVIDEOS など

## ⚠️ 注意事項

### セキュリティ
- 成人向けコンテンツのスクリーンショット処理
- 適切なサニタイズとバリデーション
- データベースのバックアップ機能

### パフォーマンス
- 大きなPDFファイルの処理時間
- 画像最適化による容量削減
- トランザクション処理によるデータ整合性

### エラー処理
- PDFファイル未存在時のテストデータ生成
- ページ単位での部分的処理継続
- 詳細なログ出力

## 🧪 テスト

### テストデータ
PDFファイルが存在しない場合、以下のテストデータが自動生成されます：
- 3つのサイト情報（カリビアンコム、一本道、HEYZO）
- 6つの画像情報（各サイト2枚ずつ）

### 検証方法
```bash
# データベース内容確認
sqlite3 data.db "SELECT * FROM ad_tips;"
sqlite3 data.db "SELECT * FROM tip_images;"

# 画像ファイル確認
ls -la public/images/ad-tips/screenshots/
ls -la public/images/ad-tips/guides/
```

## 🔧 カスタマイズ

### 画像設定の変更
`extract-pdf-images.js`の`convertOptions`を編集：
```javascript
const convertOptions = {
  density: 300,        // DPI設定
  width: 1200,         # 最大幅
  height: 1600        # 最大高さ
};
```

### サイトマッピング追加
`extract-pdf-tips.js`の`SITE_MAPPING`オブジェクトに追加：
```javascript
'新サイト名': { 
  db_name: 'new_site', 
  category: 'premium' 
}
```

## 📈 拡張可能性

- OCR機能追加（画像内テキスト認識）
- 自動分類機能（AI/MLベース）
- リアルタイム監視機能
- Web UI管理画面
- API エンドポイント化