/** Meilisearch検索エラー */
export class SearchError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SearchError";
  }
}
