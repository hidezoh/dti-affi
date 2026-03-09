import type { Child } from 'hono/jsx';

interface LayoutProps {
  title?: string;
  description?: string;
  children: Child;
}

// 共通HTMLレイアウト（<html>, <head>, <body>）
export function Layout({ title = 'Velvet Lounge', description = '厳選されたプレミアムコンテンツ', children }: LayoutProps) {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="stylesheet" href="/static/styles.css" />
      </head>
      <body class="antialiased bg-black text-white">
        {children}
      </body>
    </html>
  );
}
