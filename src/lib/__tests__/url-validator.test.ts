import { describe, it, expect } from "vitest";
import { isValidAffiliateUrl, sanitizeAffiliateUrl } from "../url-validator.js";

describe("isValidAffiliateUrl", () => {
  it("許可ドメインのhttps URLを許可する", () => {
    expect(isValidAffiliateUrl("https://al.dmm.co.jp/lp/?id=123")).toBe(true);
    expect(isValidAffiliateUrl("https://www.dmm.co.jp/video/detail/?id=abc")).toBe(true);
    expect(isValidAffiliateUrl("https://www.dmm.com/digital/video/")).toBe(true);
  });

  it("httpスキームを拒否する", () => {
    expect(isValidAffiliateUrl("http://al.dmm.co.jp/lp/?id=123")).toBe(false);
  });

  it("javascript: プロトコルを拒否する", () => {
    expect(isValidAffiliateUrl("javascript:alert(1)")).toBe(false);
  });

  it("data: プロトコルを拒否する", () => {
    expect(isValidAffiliateUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("許可されていないドメインを拒否する", () => {
    expect(isValidAffiliateUrl("https://evil.com/redirect")).toBe(false);
    expect(isValidAffiliateUrl("https://dmm.co.jp.evil.com/")).toBe(false);
  });

  it("空文字・不正な文字列を拒否する", () => {
    expect(isValidAffiliateUrl("")).toBe(false);
    expect(isValidAffiliateUrl("not-a-url")).toBe(false);
  });
});

describe("sanitizeAffiliateUrl", () => {
  it("安全なURLをそのまま返す", () => {
    const url = "https://al.dmm.co.jp/lp/?id=123";
    expect(sanitizeAffiliateUrl(url)).toBe(url);
  });

  it("不正なURLにはnullを返す", () => {
    expect(sanitizeAffiliateUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeAffiliateUrl("")).toBeNull();
  });
});
