import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("filters items and exposes a static detail route", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A trustworthy foundation for dense dungeon knowledge.",
    }),
  ).toBeVisible();

  const search = page.getByRole("searchbox", { name: "Search items" });
  await search.fill("blade");
  await expect(page.getByText("1 matching item")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Clockwork Blade" }),
  ).toBeVisible();

  await search.fill("");
  const category = page.getByRole("combobox", { name: "Category" });
  await category.focus();
  await category.press("Enter");
  await page.getByRole("option", { name: "Material" }).press("Enter");
  await expect(page.getByRole("link", { name: "Brass Ingot" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Clockwork Blade" })).toHaveCount(
    0,
  );

  await page.getByRole("button", { name: "Reset filters" }).click();
  await page.getByRole("link", { name: "Clockwork Blade" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Clockwork Blade" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Provenance" })).toBeVisible();
  await expect(
    page.getByText("Synthetic Expansion", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Dataset version")).toBeVisible();
  await expect(page.getByText("Source version")).toBeVisible();
  await expect(
    page.getByText("Reviewed patch: synthetic-clockwork-blade-value"),
  ).toBeVisible();
  await expect(page.getByText("price: 155 to 160")).toBeVisible();
  await page.getByRole("link", { name: "Melee Power" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Melee Power" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Items with this stat" }),
  ).toBeVisible();
  await expect(page.getByText("Dataset version")).toBeVisible();
  await expect(page.getByText("Source version")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Clockwork Blade" }),
  ).toBeVisible();
});

test("searches items and stats with shareable structured filters", async ({
  page,
}) => {
  await page.goto("/search/");
  const search = page.getByRole("searchbox", { name: "Search terms" });
  await search.fill("melee power");
  await expect(page).toHaveURL(/q=melee(?:\+|%20)power/);
  await expect(page.getByText("2 matching records")).toBeVisible();

  const type = page.getByRole("combobox", { name: "Entity type" });
  await type.focus();
  await type.press("Enter");
  await page.getByRole("option", { name: "Stats", exact: true }).press("Enter");
  await expect(page).toHaveURL(/kind=stat/);
  await expect(page.getByText("1 matching record")).toBeVisible();
  await expect(page.getByRole("link", { name: "Melee Power" })).toBeVisible();

  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page).toHaveURL(/\/search\/?$/);
});

test("resolves alternate aliases to their canonical item route", async ({
  page,
}) => {
  for (const alias of ["clockwork-blade-plus", "clockwork-sword"]) {
    await page.goto(`/items/${alias}/`);
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "This alternate URL resolves to Clockwork Blade",
      }),
    ).toBeVisible();
    const canonical = page.getByRole("link", { name: "Open canonical URL" });
    await expect(canonical).toHaveAttribute("href", "/items/clockwork-blade/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, follow",
    );
    await canonical.click();
    await expect(page).toHaveURL(/\/items\/clockwork-blade\/$/);
  }
});

test("follows explicit item and recipe backlinks", async ({ page }) => {
  await page.goto("/items/brass-ingot/");
  await expect(
    page.getByRole("heading", { level: 3, name: "Used to craft" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clockwork Blade Recipe" }).click();
  await expect(page).toHaveURL(/\/recipes\/clockwork-blade-recipe\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Clockwork Blade Recipe" }),
  ).toBeVisible();
  await expect(page.getByText("Required skill")).toBeVisible();
  await expect(page.getByText("Visible recipe")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Ingredients" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Brass Ingot" })).toBeVisible();
  await expect(page.getByText("Missing Cog", { exact: true })).toBeVisible();
  await expect(page.getByText("Unresolved item")).toBeVisible();
  await page.getByRole("link", { name: "Clockwork Blade" }).click();
  await expect(page).toHaveURL(/\/items\/clockwork-blade\/$/);
  await expect(
    page.getByRole("heading", { level: 3, name: "Crafted by" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Clockwork Blade Recipe" }),
  ).toBeVisible();
});

test("representative pages have no automatically detectable accessibility violations", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/search/",
    "/items/clockwork-blade/",
    "/items/clockwork-blade-plus/",
    "/items/clockwork-sword/",
    "/recipes/clockwork-blade-recipe/",
    "/stats/melee-power/",
  ]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  }
});
