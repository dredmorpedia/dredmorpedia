import { expect, test } from "@playwright/test";

const basePath = process.env.DREDMORPEDIA_E2E_BASE_PATH ?? "";

test("loads detached search and preview data below the hosting subpath", async ({
  page,
}) => {
  test.skip(!basePath, "Run with a matching subpath static export.");

  const searchData = page.waitForResponse((response) =>
    response.url().endsWith(`${basePath}/search-data.json`),
  );
  await page.goto(`${basePath}/search/?q=clockwork`);
  expect((await searchData).status()).toBe(200);
  await expect(page.getByText(/matching records/)).toBeVisible();

  await page.goto(`${basePath}/items/category/material/1/`);
  const catalogueData = page.waitForResponse((response) =>
    response.url().endsWith(`${basePath}/catalogue-previews.json`),
  );
  await page
    .getByRole("button", { name: /^Preview Clockwork Blade Recipe:/ })
    .focus();
  expect((await catalogueData).status()).toBe(200);
  await expect(
    page.getByRole("dialog", {
      name: /^Recipe preview: Clockwork Blade Recipe:/,
    }),
  ).toBeVisible();

  await page.goto(`${basePath}/crafts/tool/smithing/`);
  const itemData = page.waitForResponse((response) =>
    response
      .url()
      .endsWith(`${basePath}/item-previews/clockwork-blade/summary.json`),
  );
  await page
    .getByRole("button", { name: "Preview Clockwork Blade", exact: true })
    .first()
    .focus();
  expect((await itemData).status()).toBe(200);
  await expect(
    page.getByRole("dialog", { name: "Item preview: Clockwork Blade" }),
  ).toBeVisible();
});
