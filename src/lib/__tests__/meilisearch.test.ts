import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../types/env.js";
import {
  createSearchClient,
  getLatestVideos,
  MeilisearchSearchError,
  searchVideos,
} from "../meilisearch.js";

const mockSearch = vi.fn();

// MeiliSearchをクラスとしてモック
vi.mock("meilisearch", () => {
  return {
    MeiliSearch: class {
      index() {
        return { search: mockSearch };
      }
    },
  };
});

const mockEnv: Env = {
  MEILISEARCH_HOST: "https://test.meilisearch.com",
  MEILISEARCH_SEARCH_API_KEY: "test-key",
};

describe("createSearchClient", () => {
  it("MEILISEARCH_HOST が未設定の場合にエラーを投げる", () => {
    const envWithoutHost = { ...mockEnv, MEILISEARCH_HOST: "" };
    expect(() => createSearchClient(envWithoutHost)).toThrow(
      "MEILISEARCH_HOST が設定されていません",
    );
  });

  it("正常な環境変数でクライアントを生成できる", () => {
    expect(() => createSearchClient(mockEnv)).not.toThrow();
  });
});

describe("getLatestVideos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ページネーション付きの結果を返す", async () => {
    mockSearch.mockResolvedValue({
      hits: [{ id: "1", title: "テスト動画" }],
      totalHits: 100,
      totalPages: 5,
      page: 1,
      hitsPerPage: 24,
    });

    const result = await getLatestVideos(mockEnv);

    expect(result.hits).toHaveLength(1);
    expect(result.totalHits).toBe(100);
    expect(result.totalPages).toBe(5);
    expect(result.page).toBe(1);
    expect(result.hitsPerPage).toBe(24);
  });

  it("ページ番号を指定して取得できる", async () => {
    mockSearch.mockResolvedValue({
      hits: [],
      totalHits: 100,
      totalPages: 5,
      page: 3,
      hitsPerPage: 24,
    });

    const result = await getLatestVideos(mockEnv, 3);

    expect(result.page).toBe(3);
    expect(mockSearch).toHaveBeenCalledWith(
      "",
      expect.objectContaining({
        page: 3,
        hitsPerPage: 24,
        sort: ["release_date:desc"],
      }),
    );
  });

  it("Meilisearchエラー時にMeilisearchSearchErrorを投げる", async () => {
    mockSearch.mockRejectedValue(new Error("Connection refused"));

    await expect(getLatestVideos(mockEnv)).rejects.toThrow(MeilisearchSearchError);
    await expect(getLatestVideos(mockEnv)).rejects.toThrow("最新動画の取得に失敗しました");
  });
});

describe("searchVideos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("キーワード検索でページネーション付きの結果を返す", async () => {
    mockSearch.mockResolvedValue({
      hits: [{ id: "2", title: "検索結果" }],
      totalHits: 50,
      totalPages: 3,
      page: 1,
      hitsPerPage: 24,
    });

    const result = await searchVideos(mockEnv, "テスト");

    expect(result.hits).toHaveLength(1);
    expect(result.totalHits).toBe(50);
    expect(result.totalPages).toBe(3);
    expect(mockSearch).toHaveBeenCalledWith(
      "テスト",
      expect.objectContaining({
        page: 1,
        hitsPerPage: 24,
        sort: ["release_date:desc"],
      }),
    );
  });

  it("ページ番号とhitsPerPageを指定できる", async () => {
    mockSearch.mockResolvedValue({
      hits: [],
      totalHits: 50,
      totalPages: 5,
      page: 2,
      hitsPerPage: 10,
    });

    const result = await searchVideos(mockEnv, "女優名", 2, 10);

    expect(result.page).toBe(2);
    expect(result.hitsPerPage).toBe(10);
    expect(mockSearch).toHaveBeenCalledWith(
      "女優名",
      expect.objectContaining({
        page: 2,
        hitsPerPage: 10,
        sort: ["release_date:desc"],
      }),
    );
  });

  it("Meilisearchエラー時にMeilisearchSearchErrorを投げる", async () => {
    mockSearch.mockRejectedValue(new Error("Timeout"));

    await expect(searchVideos(mockEnv, "テスト")).rejects.toThrow(MeilisearchSearchError);
    await expect(searchVideos(mockEnv, "テスト")).rejects.toThrow("動画の検索に失敗しました");
  });
});
