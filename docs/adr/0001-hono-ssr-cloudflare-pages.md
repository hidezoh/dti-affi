# ADR-0001: Hono SSR + Cloudflare Pages 採用

## Status

Accepted

## Context

アフィリエイト管理アプリケーションのフレームワーク選定が必要。要件：
- SEO対応のためSSR必須（アフィリエイトページはクローラビリティが重要）
- エッジでの低レイテンシ実行
- 軽量かつ高速な開発体験
- Cloudflareエコシステム（D1, KV, R2）との統合

候補: Next.js (Vercel), Remix, Hono SSR (Cloudflare Pages)

## Decision

Hono 4 + Cloudflare Pages/Workers を採用する。

- Hono JSX（React互換）によるSSRでSEOを確保
- Cloudflare Workers上でエッジ実行
- Cloudflare D1/KV/R2とのネイティブ統合
- 軽量（依存関係が少なく、Cold startが高速）

## Consequences

**メリット:**
- エッジSSRによる低レイテンシ
- Cloudflareバインディング（`c.env`）でシンプルな環境変数管理
- バンドルサイズが小さく、デプロイが高速
- Workers無料枠で運用コスト最小化

**デメリット:**
- Next.jsと比較してエコシステムが小さい
- クライアントサイドの状態管理は自前実装が必要
- Hono JSXはReactの完全な代替ではない（一部のReactライブラリが使えない）
