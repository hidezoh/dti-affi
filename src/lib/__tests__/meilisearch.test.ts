import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchError } from "../errors.js";

// Meilisearch SDKをモック
const mockSearch = vi.fn();
const mockGetDocument = vi.fn();
const mockIndex = vi.fn(() => ({
  search: mockSearch,
  getDocument: mockGetDocument,
}));

vi.mock("meilisearch", () => ({
  MeiliSearch: class {
    index = mockIndex;
  },
}));

// モック後にインポート
const { getLatestVideos, searchVideos, getVideoById, createSearchClient } = await import(
  "../meilisearch.js"
);

const mockEnv = {
  MEILISEARCH_HOST: "https://test.meilisearch.com",
  MEILISEARCH_SEARCH_API_KEY: "test-key",
};

const mockVideoHits = [
  { id: "v1", title: "テスト動画1", actress: "テスト", release_date: "2025-01-01" },
  { id: "v2", title: "テスト動画2", actress: "テスト", release_date: "2025-01-02" },
];

describe("createSearchClient", () => {
  it("MEILISEARCH_HOST未設定でエラーをスローする", () => {
    expect(() => createSearchClient({ MEILISEARCH_HOST: "" } as never)).toThrow(
      "MEILISEARCH_HOST が設定されていません",
    );
  });

  it("正常な環境変数でクライアントを生成する", () => {
    expect(() => createSearchClient(mockEnv as never)).not.toThrow();
  });
});

describe("getLatestVideos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PaginatedResult構造で結果を返す", async () => {
    mockSearch.mockResolvedValueOnce({
      hits: mockVideoHits,
      totalHits: 100,
      page: 1,
      totalPages: 5,
      hitsPerPage: 24,
    });

    const result = await getLatestVideos(mockEnv as never, 1, 24);

    expect(result).toEqual({
      hits: mockVideoHits,
      totalHits: 100,
      page: 1,
      totalPages: 5,
      hitsPerPage: 24,
    });
    expect(mockSearch).toHaveBeenCalledWith("", {
      page: 1,
      hitsPerPage: 24,
      sort: ["release_date:desc"],
    });
  });

  it("エラー時にSearchErrorをスローする", async () => {
    mockSearch.mockRejectedValueOnce(new Error("Connection refused"));

    await expect(getLatestVideos(mockEnv as never)).rejects.toThrow(SearchError);
  });

  it("エラー時にconsole.errorが呼ばれる", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSearch.mockRejectedValueOnce(new Error("Timeout"));

    await expect(getLatestVideos(mockEnv as never)).rejects.toThrow(SearchError);
    expect(consoleSpy).toHaveBeenCalledWith("最新動画の取得に失敗しました:", expect.any(Error));
    consoleSpy.mockRestore();
  });
});

describe("searchVideos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PaginatedResult構造で検索結果を返す", async () => {
    mockSearch.mockResolvedValueOnce({
      hits: mockVideoHits,
      totalHits: 50,
      page: 2,
      totalPages: 3,
      hitsPerPage: 24,
    });

    const result = await searchVideos(mockEnv as never, "テスト", 2, 24);

    expect(result).toEqual({
      hits: mockVideoHits,
      totalHits: 50,
      page: 2,
      totalPages: 3,
      hitsPerPage: 24,
    });
    expect(mockSearch).toHaveBeenCalledWith("テスト", {
      page: 2,
      hitsPerPage: 24,
      sort: ["release_date:desc"],
    });
  });

  it("エラー時にSearchErrorをスローする", async () => {
    mockSearch.mockRejectedValueOnce(new Error("Network error"));

    await expect(searchVideos(mockEnv as never, "テスト")).rejects.toThrow(SearchError);
  });
});

describe("getVideoById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("動画が見つかった場合にVideoオブジェクトを返す", async () => {
    const mockVideo = { id: "v1", title: "テスト動画" };
    mockGetDocument.mockResolvedValueOnce(mockVideo);

    const result = await getVideoById(mockEnv as never, "v1");
    expect(result).toEqual(mockVideo);
  });

  it("エラー時にnullを返す", async () => {
    mockGetDocument.mockRejectedValueOnce(new Error("Not found"));

    const result = await getVideoById(mockEnv as never, "nonexistent");
    expect(result).toBeNull();
  });

  it("エラー時にconsole.errorが呼ばれる", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDocument.mockRejectedValueOnce(new Error("Not found"));

    await getVideoById(mockEnv as never, "v999");
    expect(consoleSpy).toHaveBeenCalledWith("動画 v999 の取得に失敗しました:", expect.any(Error));
    consoleSpy.mockRestore();
  });
});
