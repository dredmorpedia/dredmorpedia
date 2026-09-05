import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const planner of ["crafting", "encrusting"] as const) {
  test(`${planner} retains cyclic choices through cleanup and reload and permits recovery`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const route =
      planner === "crafting"
        ? "/tools/crafting-graph/?item=brass-ingot"
        : "/tools/encrusting-plan/?encrustment=synthetic-gear-polish";
    const cycleToken = "brass-ingot~brass-loop-recipe~0";
    await page.goto(
      `${route}&choice=${cycleToken}&choice=clockwork-blade~clockwork-blade-recipe~0&choice=invalid`,
    );

    const cycle = page.getByRole("region", { name: "Recipe cycles" });
    const choice = page.getByRole("combobox", { name: /^Brass Ingot \(/ });
    await expect(cycle).toContainText("Brass Ingot → Brass Ingot");
    await expect(cycle).toContainText("Change a recipe choice below");
    await expect(choice).toHaveAccessibleName(
      "Brass Ingot (quantity unavailable)",
    );
    await expect(choice).toHaveValue("recipe:brass loop recipe#0");
    // Stale choices still get removed; the reachable cycle selection survives.
    await expect(page).toHaveURL(
      (url) => url.searchParams.getAll("choice").join() === cycleToken,
    );
    await expect(page.locator(".crafting-step")).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Base requirements" }),
    ).toContainText(
      "Base requirements are unavailable while a recipe cycle remains.",
    );
    await expect(
      page.getByRole("region", { name: "Base requirements" }),
    ).not.toContainText("Training Gem");

    await page.reload();
    await expect(cycle).toBeVisible();
    await expect(choice).toHaveValue("recipe:brass loop recipe#0");
    await expect(page).toHaveURL(
      (url) => url.searchParams.getAll("choice").join() === cycleToken,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);

    // Home reaches the native placeholder and clears the cyclic choice using
    // only the keyboard, leaving the same control available for another path.
    await choice.focus();
    await expect(choice).toBeFocused();
    await choice.press("Home");
    await choice.press("Enter");
    await expect(cycle).toBeHidden();
    await expect(page).not.toHaveURL(/choice=/);
    await choice.selectOption("recipe:brass ingot recipe#0");
    await expect(choice).toHaveAccessibleName("Brass Ingot (1 needed)");
    await expect(
      page.getByRole("region", { name: "Base requirements" }),
    ).toContainText("Training Gem");
    await expect(page.locator(".crafting-step")).toHaveCount(1);
    await expect(page).toHaveURL(
      (url) =>
        url.searchParams.getAll("choice").join() ===
        "brass-ingot~brass-ingot-recipe~0",
    );
    expect(errors).toEqual([]);
  });
}
