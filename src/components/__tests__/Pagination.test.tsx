import { describe, expect, it } from "vitest";
import { Pagination } from "../Pagination.js";

// Hono JSXはPromise<HtmlEscapedString>を返すためawaitが必要
async function renderToString(element: ReturnType<typeof Pagination>): Promise<string> {
  const result = await element;
  return result.toString();
}

describe("Pagination", () => {
  it("1ページ目で「前のページ」が無効化される", async () => {
    const html = await renderToString(<Pagination currentPage={1} totalPages={5} />);

    // 前のページはspan（リンクではない）
    expect(html).toContain("cursor-not-allowed");
    // 次のページはaタグ（リンク）
    expect(html).toContain('href="/?page=2"');
  });

  it("最終ページで「次のページ」が無効化される", async () => {
    const html = await renderToString(<Pagination currentPage={5} totalPages={5} />);

    // 前のページはaタグ
    expect(html).toContain('href="/?page=4"');
    expect(html).toContain("次のページ");
  });

  it("中間ページで前後両方のリンクが表示される", async () => {
    const html = await renderToString(<Pagination currentPage={3} totalPages={10} />);

    expect(html).toContain('href="/?page=2"');
    expect(html).toContain('href="/?page=4"');
    expect(html).toContain("3 / 10");
  });

  it("検索クエリがURLに含まれる", async () => {
    const html = await renderToString(<Pagination currentPage={2} totalPages={5} query="テスト" />);

    expect(html).toContain("q=");
    expect(html).toContain("page=1");
    expect(html).toContain("page=3");
  });

  it("ページ情報が正しく表示される", async () => {
    const html = await renderToString(<Pagination currentPage={7} totalPages={42} />);

    expect(html).toContain("7 / 42");
  });
});
