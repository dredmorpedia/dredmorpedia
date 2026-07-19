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
});

test("representative pages have no automatically detectable accessibility violations", async ({
  page,
}) => {
  for (const route of ["/", "/items/clockwork-blade/"]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  }
});
