import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildPropertySearchPath, getSafePropertyReturnPath } from "../lib/property-navigation.ts";

test("property search path retains every supported filter and page", () => {
  const path = buildPropertySearchPath({
    region: "kyushu-okinawa",
    prefecture: "熊本県",
    city: "熊本市",
    propertyType: "house",
    priceRange: "under-300",
    sort: "price-asc",
    keyword: "空き家",
    minPrice: "0",
    maxPrice: "3000000",
    page: "3"
  });
  const url = new URL(path, "https://example.test");

  assert.equal(url.pathname, "/properties");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    region: "kyushu-okinawa",
    prefecture: "熊本県",
    city: "熊本市",
    propertyType: "house",
    priceRange: "under-300",
    sort: "price-asc",
    keyword: "空き家",
    minPrice: "0",
    maxPrice: "3000000",
    page: "3"
  });
});

test("property detail return path keeps only safe property search parameters", () => {
  const safe = getSafePropertyReturnPath("/properties?prefecture=熊本県&keyword=空き家&page=2&unexpected=secret");
  assert.equal(safe, "/properties?prefecture=%E7%86%8A%E6%9C%AC%E7%9C%8C&keyword=%E7%A9%BA%E3%81%8D%E5%AE%B6&page=2");
  assert.equal(getSafePropertyReturnPath("https://evil.example/properties?page=2"), "/properties");
  assert.equal(getSafePropertyReturnPath("//evil.example/properties?page=2"), "/properties");
  assert.equal(getSafePropertyReturnPath("/admin?page=2"), "/properties");
});

test("property UI keeps filters in details and opens sources safely", async () => {
  const [filtersSource, listSource, detailSource, loginSource] = await Promise.all([
    readFile(new URL("../components/SearchFilters.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/properties/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/properties/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/login/LoginForm.tsx", import.meta.url), "utf8")
  ]);

  assert.match(filtersSource, /value=\{selectedKeyword\}/);
  assert.match(filtersSource, /addEventListener\("popstate"/);
  assert.match(filtersSource, /addEventListener\("pageshow"/);
  assert.match(listSource, /key=\{currentSearchPath\}/);
  assert.match(listSource, /returnPath=\{currentSearchPath\}/);
  assert.match(detailSource, /rel="noopener noreferrer"/);
  assert.match(detailSource, /href=\{returnPath\}/);
  assert.match(loginSource, /useFormStatus/);
  assert.match(loginSource, /aria-live="polite"/);
  assert.match(loginSource, /disabled=\{pending\}/);
  assert.match(loginSource, /ログイン中…/);
});
