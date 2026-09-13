import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("inspects Craft outputs lazily with keyboard or touch and shares item results", async ({
  page,
  isMobile,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/item-previews/")) requests.push(request.url());
  });
  await page.goto("/crafts/tool/smithing/");
  const recipe = page.getByRole("article", {
    name: /^Clockwork Blade Recipe: 2 × Brass Ingot/,
  });
  const outputs = recipe.locator(".recipe-summary-output-reference");
  const trigger = outputs
    .first()
    .getByRole("button", { name: "Preview Clockwork Blade", exact: true });
  expect(requests).toEqual([]);
  if (isMobile) await trigger.tap();
  else await trigger.focus();
  const preview = page.getByRole("dialog", {
    name: "Item preview: Clockwork Blade",
    exact: true,
  });
  await expect(
    preview.getByRole("heading", { name: "Clockwork Blade" }),
  ).toBeVisible();
  await expect(preview.locator(".item-summary-modifiers dd")).toHaveCount(7);
  await expect(preview.getByText("Quality 8", { exact: true })).toBeVisible();
  await expect(
    preview.getByRole("link", { name: "Clockwork Spark", exact: true }),
  ).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatch(
    /\/item-previews\/clockwork-blade\/summary.json$/,
  );
  const popup = await preview.boundingBox();
  expect(popup!.width).toBeLessThanOrEqual(page.viewportSize()!.width - 20);
  expect(popup!.height).toBeLessThan(page.viewportSize()!.height);
  const contentWidth = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  // Allow subpixel rounding during the popup's short scale transition.
  expect(popup!.x).toBeGreaterThanOrEqual(11);
  expect(popup!.x + popup!.width).toBeLessThanOrEqual(contentWidth - 11);
  const contentHeight = await page.evaluate(
    () => document.documentElement.clientHeight,
  );
  expect(popup!.y).toBeGreaterThanOrEqual(11);
  expect(popup!.y + popup!.height).toBeLessThanOrEqual(contentHeight - 11);
  expect(
    (
      await new AxeBuilder({ page })
        .include(".relationship-preview-popup")
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();
  await expect(trigger).toBeFocused();
  const second = outputs
    .nth(1)
    .getByRole("button", { name: "Preview Clockwork Blade", exact: true });
  if (isMobile) await second.tap();
  else await second.focus();
  await expect(preview.locator("article")).toBeVisible();
  expect(requests).toHaveLength(1);
  await preview.getByRole("link", { name: "Full item details" }).click();
  await expect(page).toHaveURL(/\/items\/clockwork-blade\/$/);
});

test("inspects Encrust ingredients and leaves unresolved ingredients as plain text", async ({
  page,
  isMobile,
}) => {
  await page.goto("/encrusts/tool/smithing/");
  const encrust = page.getByRole("article", {
    name: /^Synthetic Gear Polish: Brass Ingot, Missing Polish/,
  });
  await expect(
    encrust.getByRole("button", { name: "Preview Missing Polish" }),
  ).toHaveCount(0);
  const trigger = encrust.getByRole("button", {
    name: "Preview Brass Ingot",
    exact: true,
  });
  if (isMobile) await trigger.tap();
  else await trigger.focus();
  const preview = page.getByRole("dialog", {
    name: "Item preview: Brass Ingot",
    exact: true,
  });
  await expect(
    preview.getByRole("heading", { name: "Brass Ingot" }),
  ).toBeVisible();
  await expect(preview.getByText("18", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();
  await expect(trigger).toBeFocused();
  await encrust.getByRole("link", { name: "Brass Ingot", exact: true }).click();
  await expect(page).toHaveURL(/\/items\/brass-ingot\/$/);
});

test("shows loading, rejects malformed item data, and retries through the same eye control", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route(
    "**/item-previews/clockwork-blade/summary.json",
    async (route) => {
      requests += 1;
      if (requests > 1) return route.continue();
      await held;
      const response = await route.fetch();
      const payload = await response.json();
      payload.item.modifiers = [null];
      await route.fulfill({ json: payload });
    },
  );
  await page.goto("/crafts/tool/smithing/");
  const trigger = page
    .getByRole("button", { name: "Preview Clockwork Blade", exact: true })
    .first();
  await trigger.focus();
  const preview = page.getByRole("dialog", {
    name: "Item preview: Clockwork Blade",
    exact: true,
  });
  await expect(preview.getByText("Loading item preview…")).toBeVisible();
  release();
  await expect(preview.getByRole("alert")).toContainText(
    "Item preview is unavailable.",
  );
  const fallback = preview.getByRole("link", {
    name: "Open full item details",
  });
  await expect(fallback).toBeFocused();
  await expect(fallback).toHaveAttribute("href", "/items/clockwork-blade/");
  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.press("Enter");
  await expect(preview.locator("article")).toBeVisible();
  expect(requests).toBe(2);
  expect(errors).toEqual([]);
});

test("keeps an item detail fallback when its preview request fails", async ({
  page,
}) => {
  await page.route("**/item-previews/**/summary.json", (route) =>
    route.abort(),
  );
  await page.goto("/encrusts/tool/smithing/");
  await page
    .getByRole("button", { name: "Preview Brass Ingot", exact: true })
    .first()
    .click();
  const fallback = page
    .getByRole("dialog")
    .getByRole("link", { name: "Open full item details" });
  await expect(fallback).toBeVisible();
  await fallback.click();
  await expect(page).toHaveURL(/\/items\/brass-ingot\/$/);
});

test("opens a reference preview on desktop hover without moving keyboard focus", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Touch uses the explicit eye control.");
  await page.goto("/crafts/tool/smithing/");
  const trigger = page.getByRole("button", { name: "Display settings" });
  await trigger.focus();
  const output = page.locator(".recipe-summary-output-reference").first();
  await output
    .getByRole("link", { name: "Clockwork Blade", exact: true })
    .hover();
  await expect(
    page
      .getByRole("dialog", {
        name: "Item preview: Clockwork Blade",
        exact: true,
      })
      .locator("article"),
  ).toBeVisible();
  await expect(trigger).toBeFocused();
});

test.describe("item reference navigation without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("keeps each item's picture and name inside one ordinary link", async ({
    page,
  }) => {
    await page.goto("/crafts/tool/smithing/");
    const output = page.locator(".recipe-summary-output-reference").first();
    const link = output.getByRole("link", {
      name: "Clockwork Blade",
      exact: true,
    });
    // Synthetic art deliberately falls back to a placeholder; it is still clickable.
    await link.locator(".catalogue-art-placeholder").click();
    await expect(page).toHaveURL(/\/items\/clockwork-blade\/$/);
  });
});
