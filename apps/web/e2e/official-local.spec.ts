import { expect, test } from "@playwright/test";

// Optional integration coverage for a separately generated, ignored official export.
const enabled = process.env.DREDMORPEDIA_E2E_OFFICIAL === "1";
const basePath = process.env.DREDMORPEDIA_E2E_BASE_PATH ?? "";

test("loads official search, recipe, and item previews", async ({
  page,
  isMobile,
}) => {
  test.skip(!enabled, "Requires the local official static export.");
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const searchData = page.waitForResponse((response) =>
    response.url().endsWith(`${basePath}/search-data.json`),
  );
  await page.goto(`${basePath}/search/?q=tesla`);
  const searchResponse = await searchData;
  expect(searchResponse.status()).toBe(200);
  expect((await searchResponse.json()).documents).toHaveLength(2_892);
  await expect(
    page.getByRole("link", { name: "Wand of Tesla", exact: true }),
  ).toBeVisible();

  await page.goto(`${basePath}/items/crude-iron-sword/`);
  const catalogueData = page.waitForResponse((response) =>
    response.url().endsWith(`${basePath}/catalogue-previews.json`),
  );
  const recipeTrigger = page.getByRole("button", {
    name: /^Preview Crude Iron Sword Recipe:/,
  });
  if (isMobile) await recipeTrigger.tap();
  else await recipeTrigger.focus();
  expect((await catalogueData).status()).toBe(200);
  await expect(
    page.getByRole("dialog", {
      name: /^Recipe preview: Crude Iron Sword Recipe:/,
    }),
  ).toBeVisible();

  await page.goto(`${basePath}/crafts/`);
  const itemData = page.waitForResponse((response) =>
    response
      .url()
      .endsWith(`${basePath}/item-previews/wand-of-tesla/summary.json`),
  );
  const itemTrigger = page.getByRole("button", {
    name: "Preview Wand of Tesla",
    exact: true,
  });
  if (isMobile) await itemTrigger.tap();
  else await itemTrigger.focus();
  expect((await itemData).status()).toBe(200);
  const itemPreview = page.getByRole("dialog", {
    name: "Item preview: Wand of Tesla",
  });
  await expect(itemPreview).toBeVisible();
  await expect(itemPreview.getByText("5–6 charges")).toBeVisible();
  await expect(
    itemPreview.getByRole("link", { name: "Voltaic Empowerment" }),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("rejects malformed official search data without a page error", async ({
  page,
}) => {
  test.skip(!enabled, "Requires the local official static export.");
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/search-data.json", async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    payload.documents = [{}];
    await route.fulfill({ json: payload });
  });
  await page.goto(`${basePath}/search/?q=tesla`);
  await expect(page.getByRole("status")).toHaveText(
    "Search data could not be loaded. Reload the page to try again.",
  );
  expect(pageErrors).toEqual([]);
});
