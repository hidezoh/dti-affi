import { describe, expect, it } from "vitest";
import { Pagination } from "../Pagination.js";

// Hono JSXのElementはPromise<HtmlEscapedString>を返す
async function renderToString(element: ReturnType<typeof Pagination>): Promise<string> {
  const result = await element;
  return result.toString();
}

describe("Pagination", () => {
  it("totalPages が 1 以下の場合は何も表示しない", async () => {
    const html = await renderToString(<Pagination currentPage={1} totalPages={1} baseUrl="/" />);
    expect(html).not.toContain("前へ");
    expect(html).not.toContain("次へ");
  });

  it("totalPages が 0 の場合も何も表示しない", async () => {
    const html = await renderToString(<Pagination currentPage={1} totalPages={0} baseUrl="/" />);
    expect(html).not.toContain("前へ");
  });

  it("1ページ目では「前へ」が無効化される", async () => {
    const html = await renderToString(<Pagination currentPage={1} totalPages={5} baseUrl="/" />);
    expect(html).toContain("cursor-not-allowed");
    expect(html).toContain("?page=2");
  });

  it("最終ページでは「次へ」が無効化される", async () => {
    const html = await renderToString(<Pagination currentPage={5} totalPages={5} baseUrl="/" />);
    expect(html).toContain("?page=4");
    expect(html).toContain("cursor-not-allowed");
  });

  it("中間ページでは前後両方のリンクが有効", async () => {
    const html = await renderToString(<Pagination currentPage={3} totalPages={5} baseUrl="/" />);
    expect(html).toContain("?page=2");
    expect(html).toContain("?page=4");
  });

  it("現在ページがグラデーションスタイルで表示される", async () => {
    const html = await renderToString(<Pagination currentPage={2} totalPages={5} baseUrl="/" />);
    expect(html).toContain("from-purple-600 to-pink-600");
  });

  it("検索クエリ付きのbaseUrlでページリンクが正しく生成される", async () => {
    const html = await renderToString(
      <Pagination currentPage={1} totalPages={3} baseUrl="/?q=test" />,
    );
    expect(html).toContain("/?q=test&amp;page=2");
  });

  it("ページ数が多い場合に省略記号が表示される", async () => {
    const html = await renderToString(<Pagination currentPage={5} totalPages={20} baseUrl="/" />);
    expect(html).toContain("...");
    expect(html).toContain(">1<");
    expect(html).toContain(">20<");
  });

  it("1ページ目へのリンクはpageパラメータなし", async () => {
    const html = await renderToString(<Pagination currentPage={2} totalPages={5} baseUrl="/" />);
    expect(html).toContain('href="/"');
  });
});
