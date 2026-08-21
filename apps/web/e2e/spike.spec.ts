import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("shows a dataset-neutral 404 for an unavailable route", async ({
  page,
}) => {
  const response = await page.goto("/spells/not-in-active-dataset/");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "That record is not in this dataset.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("It may belong to a different data source."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Search this dataset" }),
  ).toBeVisible();
});

test.describe("static browse without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("browses image-led item categories and visible relationships", async ({
    page,
  }) => {
    await page.goto("/items/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Items" }),
    ).toBeVisible();

    const categories = page.getByRole("navigation", {
      name: "Item categories",
    });
    const swords = categories.getByRole("link", {
      name: /Sword weapon, 1 item/,
    });
    await expect(swords).toHaveAttribute("aria-current", "page");
    await expect(swords).toHaveAttribute(
      "href",
      "/items/category/weapon-sword/1/",
    );
    await expect(page.locator(".item-summary-card")).toHaveCount(1);
    await expect(
      page
        .locator(".item-summary-card")
        .getByRole("link", { name: "Clockwork Blade", exact: true }),
    ).toBeVisible();

    const materials = categories.getByRole("link", { name: /Material/ });
    await materials.focus();
    await expect(materials).toBeFocused();
    await materials.press("Enter");

    await expect(page).toHaveURL(/\/items\/category\/material\/1\/$/);
    const itemContext = page.locator(".catalogue-context-bar");
    await expect(
      itemContext.getByRole("heading", { level: 2, name: "Material" }),
    ).toBeVisible();
    expect(
      await itemContext.evaluate(
        (element) => getComputedStyle(element).position,
      ),
    ).toBe("sticky");
    const brassIngot = page.locator(".item-summary-card");
    await expect(
      brassIngot.getByRole("heading", { level: 3, name: "Brass Ingot" }),
    ).toBeVisible();
    await expect(
      brassIngot.getByRole("heading", { level: 4, name: "Used to craft" }),
    ).toBeVisible();
    await expect(
      brassIngot.getByRole("link", { name: "Clockwork Blade" }),
    ).toBeVisible();
    await expect(
      brassIngot.getByRole("heading", { level: 4, name: "Used to encrust" }),
    ).toBeVisible();
    await expect(
      brassIngot.getByRole("link", { name: "Synthetic Gear Polish" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });

  test("browses complete image-led craft groups in source order", async ({
    page,
  }) => {
    await page.goto("/crafts/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Crafts" }),
    ).toBeVisible();

    const tools = page.getByRole("navigation", { name: "Crafting tools" });
    const ingot = tools.getByRole("link", { name: "Ingot, 1 recipe" });
    await expect(ingot).toHaveAttribute("aria-current", "page");
    await expect(ingot).toHaveAttribute("href", "/crafts/tool/ingot/");
    await expect(
      page.getByText("Showing 1–1 of 1 recipe for Ingot"),
    ).toBeVisible();
    await expect(page.locator(".recipe-summary-card")).toHaveCount(1);
    await expect(
      page.getByRole("link", { name: "Brass Ingot Recipe", exact: true }),
    ).toBeVisible();

    const smithing = tools.getByRole("link", {
      name: "Training Smithing Kit, 1 recipe",
    });
    await smithing.focus();
    await expect(smithing).toBeFocused();
    await smithing.press("Enter");

    await expect(page).toHaveURL(/\/crafts\/tool\/smithing\/$/);
    const craftContext = page.locator(".catalogue-context-bar");
    await expect(
      craftContext.getByRole("heading", {
        level: 2,
        name: "Training Smithing Kit",
      }),
    ).toBeVisible();
    expect(
      await craftContext.evaluate(
        (element) => getComputedStyle(element).position,
      ),
    ).toBe("sticky");
    const recipe = page.locator(".recipe-summary-card");
    await expect(
      recipe.getByRole("heading", {
        level: 3,
        name: "Clockwork Blade Recipe",
      }),
    ).toBeVisible();
    await expect(recipe.getByText("2 × Brass Ingot")).toBeVisible();
    await expect(
      recipe.getByText("Missing Cog", { exact: true }),
    ).toBeVisible();
    await expect(recipe.getByText("1 × Missing Cog")).toHaveCount(0);
    await expect(recipe.getByText("Unresolved item")).toBeVisible();
    await expect(recipe.getByText("Source level 2")).toBeVisible();
    await expect(recipe.getByText("Source level 4")).toBeVisible();
    await expect(recipe.getByText("Training Smithing Kit")).toHaveCount(0);
    await expect(
      recipe.getByRole("img", {
        name: "Crafting tool: Training Smithing Kit",
      }),
    ).toHaveCount(0);
    await expect(recipe.getByText("Highest source skill")).toHaveCount(0);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });

  test("discovers every record kind and opens a detail page", async ({
    page,
  }) => {
    await page.goto("/browse/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Browse every corner of Dredmorpedia.",
      }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Record types" })
        .locator(".browse-kind-card"),
    ).toHaveCount(9);
    await expect(
      page.getByRole("link", { name: "Required Armour by Monster" }),
    ).toHaveAttribute("href", "/meta/required-armour-by-monster/");

    const spells = page
      .getByRole("region", { name: "Record types" })
      .getByRole("link", { name: "Spells", exact: true });
    await spells.focus();
    await expect(spells).toBeFocused();
    await spells.press("Enter");

    await expect(page).toHaveURL(/\/browse\/spells\/1\/$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Spells" }),
    ).toBeVisible();
    await expect(page.getByText("Showing 1–2 of 2 records")).toBeVisible();
    expect(
      await page.locator(".browse-result-card").count(),
    ).toBeLessThanOrEqual(100);

    const spell = page.getByRole("link", { name: "Clockwork Echo" });
    await spell.focus();
    await expect(spell).toBeFocused();
    await spell.press("Enter");
    await expect(page).toHaveURL(/\/spells\/clockwork-echo\/$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Clockwork Echo" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Breadcrumb" })
        .getByRole("link", { name: "Spells" }),
    ).toHaveAttribute("href", "/browse/spells/1/");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
});

test("configures and persists the item catalogue display accessibly", async ({
  page,
}) => {
  await page.goto("/items/");
  const categories = page.getByRole("navigation", { name: "Item categories" });
  await expect(categories).toHaveAttribute("data-layout", "compact");
  await expect(categories.locator(":scope > section")).toHaveCount(0);
  await expect(categories.locator(":scope > ul")).toHaveCount(1);
  await expect(
    categories.getByRole("link", { name: /Sword weapon, 1 item/ }),
  ).toHaveAttribute("title", /represented by Clockwork Blade/);
  await expect(page.getByLabel("Source: Synthetic Override")).toHaveText("SO");
  await expect(page.getByLabel("Quality 3 out of 10")).toBeVisible();

  await page.getByRole("button", { name: "Detailed" }).click();
  await expect(categories).toHaveAttribute("data-layout", "expanded");
  await expect(categories.locator(":scope > ul")).toHaveCount(0);
  await expect(categories.locator("h2", { hasText: "Weapons" })).toBeVisible();

  const valueIcon = page.locator(".item-price-icon").first();
  await expect(valueIcon).toBeVisible();
  expect((await valueIcon.boundingBox())?.width).toBeGreaterThanOrEqual(20);
  expect(
    await page
      .locator(".item-quality-stars")
      .first()
      .evaluate((element) => getComputedStyle(element).backgroundColor),
  ).not.toBe("rgba(0, 0, 0, 0)");

  const trigger = page.getByRole("button", { name: "Display settings" });
  await trigger.focus();
  await trigger.press("Enter");
  const drawer = page.getByRole("dialog", { name: "Item display settings" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("radio", { name: /Name \(A–Z\)/ }).check();
  await drawer.getByRole("radio", { name: /All in this category/ }).check();
  await drawer.getByRole("button", { name: "Apply settings" }).click();

  await expect(page).toHaveURL(
    /\/items\/category\/weapon-sword\/view\/name\/all\/1\/$/,
  );
  await expect(categories).toHaveAttribute("data-layout", "expanded");
  await expect(
    page.getByText("Showing 1–1 of 1 item in Sword weapon"),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("navigation", { name: "Item categories" }),
  ).toHaveAttribute("data-layout", "expanded");
  await page.getByRole("button", { name: "Display settings" }).click();
  await expect(page.getByRole("radio", { name: /Name \(A–Z\)/ })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Display settings", exact: true }),
  ).toBeFocused();

  const accessibility = await new AxeBuilder({ page })
    .include("main")
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("previews a Used to craft recipe without replacing direct navigation", async ({
  page,
}, testInfo) => {
  await page.goto("/items/category/material/1/");
  const itemCard = page.locator(".item-summary-card");
  await expect(
    itemCard.getByRole("link", { name: "Clockwork Blade", exact: true }),
  ).toHaveAttribute("href", "/items/clockwork-blade/");

  const trigger = itemCard.getByRole("button", {
    name: "Preview Clockwork Blade Recipe",
  });
  const hoverTarget = itemCard.locator(".recipe-preview-target");
  const preview = page.getByRole("dialog", {
    name: "Recipe preview: Clockwork Blade Recipe",
  });
  await expect(trigger).toHaveText("");
  await expect(trigger).toHaveAttribute(
    "title",
    "Preview Clockwork Blade Recipe",
  );

  await trigger.focus();
  await expect(preview).toBeVisible();
  await expect(
    preview.getByRole("link", {
      name: "Clockwork Blade Recipe",
      exact: true,
    }),
  ).toBeFocused();
  const tool = preview.getByRole("img", {
    name: "Crafting tool: Training Smithing Kit",
  });
  await expect(tool).toBeVisible();
  await expect(tool).toHaveAttribute("title", "Training Smithing Kit");
  await expect(preview.getByText("Training Smithing Kit")).toHaveCount(0);
  await expect(preview.locator(".recipe-summary-method > *")).toHaveCount(3);
  await expect(preview.getByText("2 × Brass Ingot")).toBeVisible();
  await expect(preview.getByText("Missing Cog", { exact: true })).toBeVisible();
  await expect(preview.getByText("1 × Missing Cog")).toHaveCount(0);
  await expect(preview.getByText("Source level 4")).toBeVisible();
  await expect(
    preview.getByRole("link", { name: "Full recipe details" }),
  ).toHaveAttribute("href", "/recipes/clockwork-blade-recipe/");

  const accessibility = await new AxeBuilder({ page })
    .include(".recipe-preview-popup")
    .analyze();
  expect(accessibility.violations).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();
  await expect(trigger).toBeFocused();

  if (testInfo.project.name === "mobile-chromium") {
    await trigger.tap();
  } else {
    await hoverTarget.hover();
  }
  await expect(preview).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();

  await page.keyboard.press("Tab");
  await trigger.focus();
  await expect(preview).toBeVisible();
});

test("configures and persists the Craft catalogue display accessibly", async ({
  page,
}) => {
  await page.goto("/crafts/");
  const tools = page.getByRole("navigation", { name: "Crafting tools" });
  await expect(tools).toHaveAttribute("data-layout", "compact");
  const smithingLabel = tools.getByText("Training Smithing Kit", {
    exact: true,
  });
  expect(
    await smithingLabel.evaluate(
      (element) => getComputedStyle(element).clipPath,
    ),
  ).toBe("inset(50%)");

  await page.getByRole("button", { name: "Detailed" }).click();
  await expect(tools).toHaveAttribute("data-layout", "expanded");
  await expect(smithingLabel).toBeVisible();
  expect(
    await smithingLabel.evaluate(
      (element) => getComputedStyle(element).clipPath,
    ),
  ).toBe("none");

  const trigger = page.getByRole("button", { name: "Display settings" });
  await trigger.focus();
  await trigger.press("Enter");
  const drawer = page.getByRole("dialog", { name: "Craft display settings" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("radio", { name: /Name \(A–Z\)/ }).check();
  await drawer.getByRole("radio", { name: /All for this tool/ }).check();
  await drawer.getByRole("button", { name: "Apply settings" }).click();

  await expect(page).toHaveURL(/\/crafts\/tool\/ingot\/view\/name\/all\/1\/$/);
  await page.reload();
  await expect(
    page.getByRole("navigation", { name: "Crafting tools" }),
  ).toHaveAttribute("data-layout", "expanded");

  await page.getByRole("button", { name: "Display settings" }).click();
  await expect(page.getByRole("radio", { name: /Name \(A–Z\)/ })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Display settings", exact: true }),
  ).toBeFocused();

  const accessibility = await new AxeBuilder({ page })
    .include("main")
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("separates direct encyclopedia navigation from optional tools", async ({
  page,
}) => {
  await page.goto("/");
  const primary = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  await expect(primary.getByRole("link")).toHaveCount(9);
  await expect(primary.getByRole("link", { name: "Items" })).toHaveAttribute(
    "href",
    "/items/",
  );
  await expect(primary.getByRole("link", { name: "Crafts" })).toHaveAttribute(
    "href",
    "/crafts/",
  );

  const tools = page
    .getByRole("navigation", { name: "Utility navigation" })
    .getByRole("link", { name: "Tools" });
  await tools.focus();
  await expect(tools).toBeFocused();
  await tools.press("Enter");
  await expect(page).toHaveURL(/\/tools\/$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Tools for planning a build.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Item comparison" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Crafting dependency planner" }),
  ).toBeVisible();
});

test("ranks required armour by monster and links every result", async ({
  page,
}) => {
  await page.goto("/");
  const metaLink = page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Meta" });
  await metaLink.focus();
  await expect(metaLink).toBeFocused();
  await metaLink.press("Enter");

  await expect(page).toHaveURL(/\/meta\/required-armour-by-monster\/$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Required Armour by Monster",
    }),
  ).toBeVisible();
  await expect(page.getByText("Monsters evaluated")).toBeVisible();
  await expect(
    page
      .getByText("Monsters evaluated")
      .locator("..")
      .getByText("2", { exact: true }),
  ).toBeVisible();

  const results = page.locator(".required-armour-card");
  await expect(results).toHaveCount(2);
  await expect(
    results.nth(0).getByRole("link", { name: "Armored Training Diggle" }),
  ).toBeVisible();
  await expect(
    results.nth(0).getByText("Required Armour").locator("..").getByText("2"),
  ).toBeVisible();
  await expect(
    results.nth(1).getByRole("link", { name: "Training Diggle" }),
  ).toBeVisible();
  await expect(
    results.nth(1).getByText("Required Armour").locator("..").getByText("0"),
  ).toBeVisible();

  await results
    .nth(0)
    .getByRole("link", { name: "Armored Training Diggle" })
    .click();
  await expect(page).toHaveURL(/\/monsters\/armored-training-diggle\/$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Armored Training Diggle",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("previews a bounded catalogue and exposes a static detail route", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A trustworthy foundation for dense dungeon knowledge.",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { level: 2, name: "Item preview" }),
  ).toBeVisible();
  await expect(page.getByText("Showing 13 of 13 items")).toBeVisible();
  expect(await page.locator(".item-card").count()).toBeLessThanOrEqual(24);
  await expect(
    page.getByRole("link", { name: "Clockwork Blade" }),
  ).toBeVisible();
  await expect(page.getByText("Quality 3", { exact: true })).toBeVisible();

  await page.keyboard.press("Home");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await page
    .getByRole("link", { name: "Clockwork Blade", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Clockwork Blade" }),
  ).toBeVisible();
  await expect(page.getByTestId("item-icon-placeholder")).toBeVisible();
  await expect(page.locator(".detail-header img")).toHaveCount(0);
  const provenance = page.getByRole("region", { name: "Provenance" });
  await expect(provenance).toBeVisible();
  await expect(
    provenance
      .locator(".provenance-list")
      .getByText("Synthetic Override", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Dataset version")).toBeVisible();
  await expect(page.getByText("Source version")).toBeVisible();
  const overrideHistory = page.getByRole("region", {
    name: "Override history",
  });
  await expect(overrideHistory).toBeVisible();
  const overrideSteps = overrideHistory.locator(".override-step");
  await expect(overrideSteps).toHaveCount(2);
  await expect(
    overrideSteps.nth(0).getByText("Synthetic Base", { exact: true }),
  ).toBeVisible();
  await expect(
    overrideSteps.nth(0).getByText("Synthetic Expansion", { exact: true }),
  ).toBeVisible();
  await expect(overrideSteps.nth(0).getByText("quality")).toBeVisible();
  await expect(
    overrideSteps.nth(1).getByText("Synthetic Expansion", { exact: true }),
  ).toBeVisible();
  await expect(
    overrideSteps.nth(1).getByText("Synthetic Override", { exact: true }),
  ).toBeVisible();
  await expect(overrideSteps.nth(1).getByText("description")).toBeVisible();
  const itemFacts = page.locator(".price-block");
  await expect(itemFacts.getByText("Quality", { exact: true })).toBeVisible();
  await expect(itemFacts.getByText("3", { exact: true })).toBeVisible();
  await expect(itemFacts.getByText("Artifact quality")).toBeVisible();
  await expect(itemFacts.getByText("8", { exact: true })).toBeVisible();
  await expect(page.getByText("Sword weapon", { exact: true })).toBeVisible();
  const itemStats = page.getByRole("region", { name: "Stats", exact: true });
  const itemModifiers = itemStats.getByRole("region", {
    name: "Direct modifiers",
    exact: true,
  });
  await expect(itemModifiers.getByText("Crushing damage")).toBeVisible();
  await expect(itemModifiers.getByText("+4", { exact: true })).toBeVisible();
  await expect(itemModifiers.getByText("Voltaic damage")).toBeVisible();
  await expect(itemModifiers.getByText("-1", { exact: true })).toBeVisible();
  await expect(itemModifiers.getByText("Toxic resistance")).toBeVisible();
  await expect(itemModifiers.getByText("Primary attribute 2")).toBeVisible();
  await expect(itemModifiers.getByText("Secondary stat 6")).toBeVisible();
  await expect(
    itemModifiers.getByText(/retain their numeric game stat IDs/),
  ).toBeVisible();
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
    page.getByRole("heading", { name: "Reference mapping" }),
  ).toBeVisible();
  await expect(page.getByText("secondary", { exact: true })).toBeVisible();
  await expect(page.getByText("2", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Clockwork Blade" }),
  ).toBeVisible();
});

test("inspects dataset sources, diagnostics, and override decisions", async ({
  page,
}) => {
  await page.goto("/dataset/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "See how this dataset was assembled.",
    }),
  ).toBeVisible();
  const healthSummary = page.getByLabel("Dataset health summary");
  await expect(healthSummary.getByText("3", { exact: true })).toBeVisible();

  const sources = page.getByRole("region", { name: "Sources" });
  await expect(
    sources.getByText("Synthetic Base", { exact: true }),
  ).toBeVisible();
  await expect(
    sources.getByText("Synthetic Broken Mod", { exact: true }),
  ).toBeVisible();

  const diagnostics = page.getByRole("region", { name: "Diagnostics" });
  await expect(
    diagnostics.getByText("Invalid XML", { exact: true }),
  ).toBeVisible();
  await expect(
    diagnostics.getByText(/Expected closing tag 'spell'/),
  ).toBeVisible();

  const danglingSummary = diagnostics.getByText("Dangling Reference", {
    exact: true,
  });
  await danglingSummary.click();
  await expect(
    diagnostics.getByRole("link", { name: "Open Clockwork Blade Recipe" }),
  ).toBeVisible();

  const decisions = page.getByRole("region", { name: "Source decisions" });
  await expect(
    decisions.getByRole("link", { name: "Clockwork Blade" }),
  ).toBeVisible();
  await decisions.getByText("Review 3 decisions", { exact: true }).click();
  await expect(decisions.locator(".override-step")).toHaveCount(2);
  await expect(
    decisions.getByText("Reviewed patch: synthetic-clockwork-blade-value"),
  ).toBeVisible();

  const datasetLink = page.getByRole("link", {
    name: "Dataset",
    exact: true,
  });
  await datasetLink.focus();
  await expect(datasetLink).toBeFocused();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("renders a strictly validated gem classification marker", async ({
  page,
}) => {
  await page.goto("/items/training-gem/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Training Gem" }),
  ).toBeVisible();
  await expect(page.locator(".detail-header .eyebrow")).toHaveText("Gem");
  await expect(
    page.getByText(
      "A synthetic crafting gem identified by its empty source marker.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/Unsupported <gem> element was preserved/),
  ).toHaveCount(0);
});

test("searches reference entities with shareable structured filters", async ({
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

  const category = page.getByRole("combobox", { name: "Category" });
  await category.focus();
  await category.press("Enter");
  await page
    .getByRole("option", { name: "Sword weapon", exact: true })
    .press("Enter");
  await expect(page).toHaveURL(/category=weapon%3Asword/);
  await expect(page.getByText("1 matching record")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Clockwork Blade" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page).toHaveURL(/\/search\/?$/);

  await type.focus();
  await type.press("Enter");
  await page
    .getByRole("option", { name: "Recipes", exact: true })
    .press("Enter");
  await category.focus();
  await category.press("Enter");
  await page
    .getByRole("option", { name: "Smithing", exact: true })
    .press("Enter");
  await expect(page).toHaveURL(/kind=recipe/);
  await expect(page).toHaveURL(/category=smithing/);
  await expect(page.getByText("1 matching record")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Clockwork Blade Recipe" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page).toHaveURL(/\/search\/?$/);

  const stat = page.getByRole("combobox", { name: "Stat" });
  await stat.focus();
  await stat.press("Enter");
  await page
    .getByRole("option", { name: "Crushing damage", exact: true })
    .press("Enter");
  await expect(page).toHaveURL(/stat=modifier%3Adamage%3Acrushing/);
  await expect(page.getByText("4 matching records")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Clockwork Blade" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Synthetic Gear Polish" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Measured Strike" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Clockwork Spark" }),
  ).toBeVisible();
});

test("groups, bounds, and contextualizes search category filters", async ({
  page,
}) => {
  await page.goto("/search/");
  const category = page.getByRole("combobox", { name: "Category" });
  await category.focus();
  await category.press("Enter");

  await expect(page.locator('[data-slot="select-group-label"]')).toHaveText([
    "Crafting tools",
    "Item categories",
    "Monster taxonomies",
    "Skill archetypes",
    "Stat groups",
  ]);
  const categoryList = page.locator('[data-slot="select-list"]');
  await expect(categoryList).toBeVisible();
  const listMetrics = await categoryList.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
  expect(listMetrics.overflowY).toBe("auto");
  expect(listMetrics.clientHeight).toBeLessThanOrEqual(320);
  expect(listMetrics.scrollHeight).toBeGreaterThan(listMetrics.clientHeight);

  const itemGroup = page
    .locator('[data-slot="select-group"]')
    .filter({ hasText: "Item categories" });
  await expect(itemGroup.getByRole("option")).toHaveText([
    "Booze",
    "Chest armour",
    "Food",
    "Gem",
    "Item",
    "Material",
    "Mushroom",
    "Potion",
    "Sword weapon",
    "Toolkit",
    "Trap",
    "Wand",
  ]);

  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/category=secondary/);
  await expect(page.getByRole("link", { name: "Melee Power" })).toBeVisible();

  await page.goto("/search/?kind=item&category=weapon%3Asword");
  const type = page.getByRole("combobox", { name: "Entity type" });
  await type.focus();
  await type.press("Enter");
  await page
    .getByRole("option", { name: "Recipes", exact: true })
    .press("Enter");
  await expect(page).toHaveURL(/kind=recipe/);
  await expect(page).not.toHaveURL(/category=/);

  await category.focus();
  await category.press("Enter");
  await expect(page.locator('[data-slot="select-group-label"]')).toHaveText([
    "Crafting tools",
  ]);
  await expect(page.getByRole("option")).toHaveText([
    "All categories",
    "Ingot",
    "Smithing",
  ]);
  await page.keyboard.press("Escape");

  await page.goto("/search/?kind=spell&category=weapon%3Asword");
  await expect(page).not.toHaveURL(/category=/);
  await expect(category).toBeDisabled();
});

test("reuses a cross-list crafting view and filters maximum source skill", async ({
  page,
}) => {
  await page.goto("/browse/");
  await page
    .getByRole("link", { name: "Crafting through skill 2", exact: true })
    .click();

  await expect(page).toHaveURL(/kind=crafting/);
  await expect(page).toHaveURL(/maxSkill=2/);
  await expect(page.getByText("2 matching records")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Brass Ingot Recipe" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Synthetic Gear Polish" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Clockwork Blade Recipe" }),
  ).toHaveCount(0);

  const skill = page.getByRole("combobox", {
    name: "Maximum source skill",
  });
  await expect(skill).toHaveText("Level 2 or lower");
  await skill.focus();
  await skill.press("Enter");
  await page
    .getByRole("option", { name: "Level 1 or lower", exact: true })
    .press("Enter");
  await expect(page).toHaveURL(/maxSkill=1/);
  await expect(page.getByText("1 matching record")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Brass Ingot Recipe" }),
  ).toBeVisible();

  const type = page.getByRole("combobox", { name: "Entity type" });
  await type.focus();
  await type.press("Enter");
  await page.getByRole("option", { name: "Items", exact: true }).press("Enter");
  await expect(page).toHaveURL(/kind=item/);
  await expect(page).not.toHaveURL(/maxSkill=/);
  await expect(skill).toBeDisabled();

  await page.goto("/search/?kind=crafting&maxSkill=3");
  await expect(page).not.toHaveURL(/maxSkill=/);
});

test("searches every record kind without losing sequential input", async ({
  page,
}) => {
  await page.goto("/search/");
  const type = page.getByRole("combobox", { name: "Entity type" });
  await type.focus();
  await type.press("Enter");
  await page
    .getByRole("option", { name: "Spells", exact: true })
    .press("Enter");
  await expect(page).toHaveURL(/kind=spell/);

  const search = page.getByRole("searchbox", { name: "Search terms" });
  await search.pressSequentially("Clockwork Echo", { delay: 25 });
  await expect(search).toHaveValue("Clockwork Echo");
  await expect(page).toHaveURL(/q=Clockwork(?:\+|%20)Echo/);
  await expect(page.getByText("1 matching record")).toBeVisible();

  const result = page.getByRole("link", { name: "Clockwork Echo" });
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/\/spells\/clockwork-echo\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Clockwork Echo" }),
  ).toBeVisible();
});

test("offers keyboard-selectable spelling suggestions only within active filters", async ({
  page,
}) => {
  await page.goto("/search/?kind=item&q=clokwork+blade");
  await expect(page.getByText("0 matching records")).toBeVisible();

  const suggestions = page.getByRole("region", {
    name: "Did you mean one of these names?",
  });
  await expect(suggestions).toBeVisible();
  expect(await suggestions.getByRole("button").count()).toBeLessThanOrEqual(5);

  const clockworkBlade = suggestions.getByRole("button", {
    name: /Clockwork Blade/,
  });
  await clockworkBlade.focus();
  await expect(clockworkBlade).toBeFocused();
  await clockworkBlade.press("Enter");

  const search = page.getByRole("searchbox", { name: "Search terms" });
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("Clockwork Blade");
  await expect(page).toHaveURL(/kind=item.*q=Clockwork(?:\+|%20)Blade/);
  await expect(page.getByText("1 matching record")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Clockwork Blade" }),
  ).toBeVisible();

  await page.goto("/search/?kind=spell&q=clokwork+blade");
  await expect(page.getByText("0 matching records")).toBeVisible();
  await expect(
    page.getByRole("region", {
      name: "Did you mean one of these names?",
    }),
  ).toHaveCount(0);
});

test("finds and renders a targeting template with a keyboard flow", async ({
  page,
}) => {
  await page.goto("/search/?kind=template&q=small+cross");
  await expect(
    page.getByRole("combobox", { name: "Entity type" }),
  ).toContainText("Templates");
  await expect(page.getByText("1 matching record")).toBeVisible();

  const templateLink = page.getByRole("link", { name: "Small Cross" });
  await templateLink.focus();
  await expect(templateLink).toBeFocused();
  await templateLink.press("Enter");

  await expect(page).toHaveURL(/\/templates\/small-cross\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Small Cross" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: /3 rows by 3 columns; 5 affected tiles; anchor is affected/i,
    }),
  ).toBeVisible();
  await expect(page.getByText("Anchor (affected)")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Provenance" })).toBeVisible();
  const usedBy = page.getByRole("region", { name: "Used by spells" });
  await expect(
    usedBy.getByText("Anchor-player source flag: yes"),
  ).toBeVisible();
  const spellLink = usedBy.getByRole("link", { name: "Clockwork Echo" });
  await spellLink.focus();
  await expect(spellLink).toBeFocused();
  await spellLink.press("Enter");
  await expect(page).toHaveURL(/\/spells\/clockwork-echo\/$/);
  const targetingPattern = page.getByRole("region", {
    name: "Targeting pattern",
  });
  await expect(
    targetingPattern.getByRole("link", { name: "Small Cross" }),
  ).toHaveAttribute("href", "/templates/small-cross/");
  await expect(
    targetingPattern.getByText("Unresolved template reference"),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("resolves alternate aliases to their canonical item route", async ({
  page,
}) => {
  for (const alias of ["clockwork-blade-plus", "clockwork-sword"]) {
    await page.goto(`/items/${alias}/`);
    await expect(page.locator("h1, h2").first()).toHaveText("Clockwork Blade");
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

test("follows item, recipe, and encrustment backlinks", async ({ page }) => {
  await page.goto("/items/brass-ingot/");
  await expect(
    page.getByRole("heading", { level: 3, name: "Used to craft" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Used to encrust" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Synthetic Gear Polish" }).click();
  await expect(page).toHaveURL(/\/encrustments\/synthetic-gear-polish\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Synthetic Gear Polish" }),
  ).toBeVisible();
  await expect(page.getByText("Visible encrustment")).toBeVisible();
  await expect(page.getByText("+5", { exact: true })).toBeVisible();
  await expect(page.getByText("Ranged", { exact: true })).toBeVisible();
  await expect(page.getByText("Weapon", { exact: true })).toBeVisible();
  const outcomes = page.getByRole("region", { name: "Outcomes" });
  await expect(outcomes.getByText("Crushing damage")).toBeVisible();
  await expect(outcomes.getByText("+2", { exact: true })).toBeVisible();
  await expect(outcomes.getByText("Voltaic damage")).toBeVisible();
  await expect(outcomes.getByText("-1", { exact: true })).toBeVisible();
  await expect(outcomes.getByText("Toxic resistance")).toBeVisible();
  await expect(outcomes.getByText("Primary attribute 2")).toBeVisible();
  await expect(outcomes.getByText("Secondary stat 6")).toBeVisible();
  await expect(outcomes.getByText("Synthetic Pulse")).toBeVisible();
  await expect(outcomes.getByText("25% chance")).toBeVisible();
  await expect(outcomes.getByText("polished brass")).toBeVisible();
  const instabilityPool = page.getByRole("region", {
    name: "Shared instability pool",
  });
  await expect(
    instabilityPool.getByText(
      /no effect weights, per-encrustment assignments, or complete risk formula/i,
    ),
  ).toBeVisible();
  await instabilityPool.getByText("Show 2 effect definitions").click();
  await expect(instabilityPool.getByText("Synthetic Mishap")).toBeVisible();
  await expect(
    instabilityPool.getByText("Clockwork Spark", { exact: true }),
  ).toBeVisible();
  await expect(
    instabilityPool.getByText("Resolved target spell · Synthetic Base"),
  ).toBeVisible();
  await expect(instabilityPool.getByText("Broken Mishap")).toBeVisible();
  await expect(
    instabilityPool.getByText("Missing Instability Spell", { exact: true }),
  ).toBeVisible();
  await expect(
    instabilityPool.getByText("Unresolved spell reference · Synthetic Base"),
  ).toBeVisible();
  await expect(page.getByText("Missing Polish", { exact: true })).toBeVisible();
  await expect(page.getByText("Unresolved item")).toBeVisible();
  await page.getByRole("link", { name: "Brass Ingot" }).click();
  await expect(page).toHaveURL(/\/items\/brass-ingot\/$/);
  await page.getByRole("link", { name: "Clockwork Blade Recipe" }).click();
  await expect(page).toHaveURL(/\/recipes\/clockwork-blade-recipe\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Clockwork Blade Recipe" }),
  ).toBeVisible();
  await expect(page.getByText("Highest source skill")).toBeVisible();
  await expect(page.getByText("Visible recipe")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Ingredients" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Brass Ingot" })).toBeVisible();
  await expect(page.getByText("Missing Cog", { exact: true })).toBeVisible();
  await expect(page.getByText("Unresolved item")).toBeVisible();
  await page
    .getByRole("link", { name: "Clockwork Blade", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/items\/clockwork-blade\/$/);
  await expect(
    page.getByRole("heading", { level: 3, name: "Crafted by" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Clockwork Blade Recipe" }),
  ).toBeVisible();
});

test("builds and restores a shareable recursive crafting plan", async ({
  page,
}) => {
  await page.goto("/items/clockwork-blade/");
  const plannerLink = page.getByRole("link", {
    name: "Plan ingredients for Clockwork Blade",
  });
  await plannerLink.focus();
  await expect(plannerLink).toBeFocused();
  await plannerLink.press("Enter");

  await expect(page).toHaveURL(
    /\/tools\/crafting-graph\/\?item=clockwork-blade/,
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Crafting dependency planner",
    }),
  ).toBeVisible();
  const quantity = page.getByRole("spinbutton", { name: "Quantity" });
  await quantity.fill("3");
  await expect(page).toHaveURL(/quantity=3/);
  await quantity.fill("");
  await quantity.press("Tab");
  await expect(quantity).toHaveValue("3");
  await expect(page).toHaveURL(/quantity=3/);

  const bladeYield = page.getByRole("combobox", {
    name: /Clockwork Blade \(3 needed\)/,
  });
  await bladeYield.focus();
  await expect(bladeYield).toBeFocused();
  await bladeYield.selectOption({
    label: "2 per craft at source skill 4 — Clockwork Blade Recipe",
  });

  const ingotYield = page.getByRole("combobox", {
    name: /Brass Ingot \(4 needed\)/,
  });
  await expect(ingotYield).toBeVisible();
  await ingotYield.selectOption({
    label: "2 per craft at source skill 1 — Brass Ingot Recipe",
  });

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new URL(window.location.href).searchParams.getAll("choice").length,
      ),
    )
    .toBe(2);
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "The plan contains unresolved ingredients",
    }),
  ).toBeVisible();
  const steps = page.getByRole("region", { name: "Crafting steps" });
  await expect(
    steps.getByRole("heading", { level: 3, name: "Clockwork Blade" }),
  ).toBeVisible();
  await expect(
    steps.getByRole("heading", { level: 3, name: "Brass Ingot" }),
  ).toBeVisible();
  const shoppingList = page.getByRole("region", {
    name: "Base requirements",
  });
  const trainingGemRequirement = shoppingList
    .getByRole("listitem")
    .filter({ hasText: "Training Gem" });
  await expect(trainingGemRequirement).toContainText("2");
  const missingCogRequirement = shoppingList
    .getByRole("listitem")
    .filter({ hasText: "Missing Cog" });
  await expect(missingCogRequirement).toContainText("2");

  await page.reload();
  await expect(page.getByRole("spinbutton", { name: "Quantity" })).toHaveValue(
    "3",
  );
  await expect(
    page.getByRole("region", { name: "Crafting steps" }),
  ).toContainText("Brass Ingot Recipe");
  await expect(
    page.getByRole("combobox", { name: /Clockwork Blade \(3 needed\)/ }),
  ).toHaveValue("recipe:clockwork blade recipe#1");
  await expect(
    page.getByRole("combobox", { name: /Brass Ingot \(4 needed\)/ }),
  ).toHaveValue("recipe:brass ingot recipe#1");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("explains stale crafting URLs and removes invalid calculation state", async ({
  page,
}) => {
  await page.goto(
    "/tools/crafting-graph/?item=not-in-dataset&quantity=0&choice=clockwork-blade~clockwork-blade-recipe~1&choice=invalid",
  );
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "This item is not craftable in the active dataset.",
    }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/quantity=/);
  await expect(page).not.toHaveURL(/choice=/);
});

test("builds and restores a shareable encrustment ingredient plan", async ({
  page,
}) => {
  await page.goto("/encrustments/synthetic-gear-polish/");
  const plannerLink = page.getByRole("link", {
    name: "Plan ingredients for Synthetic Gear Polish",
  });
  await plannerLink.focus();
  await expect(plannerLink).toBeFocused();
  await plannerLink.press("Enter");

  await expect(page).toHaveURL(
    /\/tools\/encrusting-plan\/\?encrustment=synthetic-gear-polish/,
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Encrustment ingredient planner",
    }),
  ).toBeVisible();
  const applications = page.getByRole("spinbutton", { name: "Applications" });
  await applications.fill("3");
  await expect(page).toHaveURL(/quantity=3/);
  await applications.fill("");
  await applications.press("Tab");
  await expect(applications).toHaveValue("3");

  const directIngredients = page.getByRole("region", {
    name: "Application ingredients",
  });
  await expect(
    directIngredients.getByRole("listitem").filter({ hasText: "Brass Ingot" }),
  ).toContainText("3");
  await expect(
    directIngredients
      .getByRole("listitem")
      .filter({ hasText: "Missing Polish" }),
  ).toContainText("3");

  const ingotYield = page.getByRole("combobox", {
    name: /Brass Ingot \(3 needed\)/,
  });
  await ingotYield.selectOption({
    label: "2 per craft at source skill 1 — Brass Ingot Recipe",
  });
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "The plan contains unresolved ingredients",
    }),
  ).toBeVisible();
  const steps = page.getByRole("region", { name: "Crafting steps" });
  await expect(
    steps.getByRole("heading", { level: 3, name: "Brass Ingot" }),
  ).toBeVisible();
  await expect(steps).toContainText("2 runs");
  await expect(steps).toContainText("1 surplus");

  const shoppingList = page.getByRole("region", {
    name: "Base requirements",
  });
  await expect(
    shoppingList.getByRole("listitem").filter({ hasText: "Training Gem" }),
  ).toContainText("2");
  await expect(
    shoppingList.getByRole("listitem").filter({ hasText: "Missing Polish" }),
  ).toContainText("3");

  await page.reload();
  await expect(
    page.getByRole("spinbutton", { name: "Applications" }),
  ).toHaveValue("3");
  await expect(
    page.getByRole("region", { name: "Crafting steps" }),
  ).toContainText("Brass Ingot Recipe");
  const restoredYield = page.getByRole("combobox", {
    name: /Brass Ingot \(3 needed\)/,
  });
  await expect(restoredYield).toHaveValue("recipe:brass ingot recipe#1");
  await restoredYield.selectOption({
    label: "1 per craft at source skill 0 — Brass Ingot Recipe",
  });
  await expect(
    page.getByRole("region", { name: "Crafting steps" }),
  ).toContainText("3 runs");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("explains stale encrustment URLs and removes invalid calculation state", async ({
  page,
}) => {
  await page.goto(
    "/tools/encrusting-plan/?encrustment=not-in-dataset&quantity=0&choice=brass-ingot~brass-ingot-recipe~1&choice=invalid",
  );
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "This encrustment is not in the active dataset.",
    }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/quantity=/);
  await expect(page).not.toHaveURL(/choice=/);
});

test("builds and restores a shareable item comparison", async ({ page }) => {
  await page.goto("/items/clockwork-blade/");
  const comparisonLink = page.getByRole("link", {
    name: "Start comparison",
  });
  await comparisonLink.focus();
  await expect(comparisonLink).toBeFocused();
  await comparisonLink.press("Enter");

  await expect(page).toHaveURL(/\/tools\/item-compare\/\?item=clockwork-blade/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Item comparison" }),
  ).toBeVisible();
  await expect(
    page.getByText("Add another item to see differences side by side."),
  ).toBeVisible();

  const secondItem = page.getByRole("combobox", { name: "Item 2" });
  await secondItem.focus();
  await secondItem.press("Enter");
  await page
    .getByRole("option", { name: "Training Cuirass", exact: true })
    .press("Enter");

  await expect(page).toHaveURL(/item=clockwork-blade&item=training-cuirass/);
  const selectedItems = page.getByRole("region", { name: "Selected items" });
  await expect(
    selectedItems.getByRole("link", { name: "Clockwork Blade" }),
  ).toBeVisible();
  await expect(
    selectedItems.getByRole("link", { name: "Training Cuirass" }),
  ).toBeVisible();

  const overview = page.getByRole("region", { name: "Overview comparison" });
  await expect(overview.getByRole("row", { name: /Category/ })).toContainText(
    "Sword weapon",
  );
  await expect(overview.getByRole("row", { name: /Category/ })).toContainText(
    "Chest armour",
  );
  await expect(overview.getByRole("row", { name: /Value/ })).toContainText(
    "160 zorkmids",
  );
  await expect(overview.getByRole("row", { name: /Value/ })).toContainText(
    "64 zorkmids",
  );
  await expect(
    overview.getByRole("row", { name: /Armour source levels/ }),
  ).toContainText("4");

  const namedStats = page.getByRole("region", {
    name: "Named stats comparison",
  });
  await expect(
    namedStats.getByRole("row", { name: /Melee Power/ }),
  ).toContainText("+6");
  await expect(
    namedStats.getByRole("row", { name: /Melee Power/ }),
  ).toContainText("Not declared");
  const modifiers = page.getByRole("region", {
    name: "Direct modifiers comparison",
  });
  await expect(
    modifiers.getByRole("row", { name: /Crushing damage/ }),
  ).toContainText("+4");
  await expect(
    page.getByText(/missing declarations are not zero/i),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByRole("combobox", { name: "Item 1" })).toHaveText(
    "Clockwork Blade",
  );
  await expect(page.getByRole("combobox", { name: "Item 2" })).toHaveText(
    "Training Cuirass",
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("canonicalizes unavailable and repeated item comparison state", async ({
  page,
}) => {
  await page.goto(
    "/tools/item-compare/?item=not-in-dataset&item=clockwork-blade&item=clockwork-blade&item=training-cuirass&item=training-wand-1&item=training-trap",
  );
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Unavailable, repeated, or extra items were removed.",
    }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        new URL(window.location.href).searchParams.getAll("item"),
      ),
    )
    .toEqual(["clockwork-blade", "training-cuirass", "training-wand-1"]);
  await expect(page.getByRole("combobox", { name: "Item 3" })).toHaveText(
    "Training Wand +1",
  );
});

test("shows resolved and unresolved item spell triggers", async ({ page }) => {
  await page.goto("/items/clockwork-blade/");
  const weaponUse = page.getByRole("region", { name: "Use metadata" });
  await expect(
    weaponUse.getByRole("heading", { name: "Weapon declarations" }),
  ).toBeVisible();
  await expect(weaponUse.getByText("Can target floor")).toBeVisible();
  await expect(weaponUse.getByText("Yes", { exact: true })).toBeVisible();
  await expect(weaponUse.getByText("Thrown presentation source")).toBeVisible();
  await expect(weaponUse.getByText("Supplied", { exact: true })).toBeVisible();
  await expect(
    weaponUse.getByText(/no recoverability or combat formula is inferred/i),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Supported fields from <weapon> were normalized, but other content remains unmodeled.",
    ),
  ).toHaveCount(0);
  const weaponTriggers = page.getByRole("region", { name: "Triggers" });
  await expect(weaponTriggers.getByText("When the item hits")).toBeVisible();
  await expect(
    weaponTriggers.getByText("Clockwork Spark", { exact: true }),
  ).toBeVisible();
  await expect(weaponTriggers.getByText("Resolved target spell")).toBeVisible();

  await page.goto("/items/training-cuirass/");
  const armourUse = page.getByRole("region", { name: "Use metadata" });
  await expect(
    armourUse.getByRole("heading", { name: "Armour declarations" }),
  ).toBeVisible();
  await expect(armourUse.getByText("chest", { exact: true })).toBeVisible();
  await expect(armourUse.getByText("Source level")).toBeVisible();
  await expect(armourUse.getByText("Random stat source")).toBeVisible();
  await expect(
    armourUse.getByText(/equipment formulas are not inferred/i),
  ).toBeVisible();
  const armourTriggers = page.getByRole("region", { name: "Triggers" });
  await expect(armourTriggers.getByText("25%", { exact: true })).toBeVisible();
  await expect(armourTriggers.getByText("30%", { exact: true })).toBeVisible();
  await expect(armourTriggers.getByText("40%", { exact: true })).toBeVisible();
  await expect(armourTriggers.getByText("50%", { exact: true })).toBeVisible();
  await expect(armourTriggers.getByText("3 turns")).toBeVisible();
  await expect(armourTriggers.getByText("Animal")).toBeVisible();
  await expect(armourTriggers.getByText("Unresistable")).toBeVisible();
  await expect(
    armourTriggers.getByText("When you are hit in melee"),
  ).toBeVisible();
  await expect(
    armourTriggers.getByText("When you kill an enemy"),
  ).toBeVisible();
  await expect(
    armourTriggers.getByText("after=1", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Supported fields from <armour> were normalized, but other content remains unmodeled.",
    ),
  ).toHaveCount(0);

  await page.goto("/items/training-trap/");
  const trapTriggers = page.getByRole("region", { name: "Triggers" });
  await expect(trapTriggers.getByText("When stepped on")).toBeVisible();
  await expect(
    trapTriggers.getByText("Synthetic Spark", { exact: true }),
  ).toBeVisible();
  await expect(
    trapTriggers.getByText("Unresolved spell reference"),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Supported fields from <trap> were normalized, but other content remains unmodeled.",
    ),
  ).toHaveCount(0);
  const trapUse = page.getByRole("region", { name: "Use metadata" });
  await expect(
    trapUse.getByRole("heading", { name: "Trap behavior" }),
  ).toBeVisible();
  await expect(trapUse.getByText("Once", { exact: true })).toBeVisible();
  await expect(trapUse.getByText("Yes", { exact: true })).toBeVisible();
  await expect(trapUse.getByText("Referenced", { exact: true })).toBeVisible();
  await expect(trapUse.getByText("wall", { exact: true })).toBeVisible();
  await expect(trapUse.getByText("south", { exact: true })).toBeVisible();
  await expect(
    trapUse.getByText(/exact runtime behavior is not inferred/),
  ).toBeVisible();
  expect(await page.locator("body").textContent()).not.toContain(
    "assets/synthetic.svg",
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("shows item recovery and wand charge source values", async ({ page }) => {
  await page.goto("/items/training-ration/");
  const rationUse = page.getByRole("region", { name: "Use metadata" });
  await expect(
    rationUse.getByRole("heading", { name: "Recovery" }),
  ).toBeVisible();
  await expect(rationUse.getByText("Life", { exact: true })).toBeVisible();
  await expect(rationUse.getByText("10", { exact: true })).toBeVisible();
  await expect(rationUse.getByText("meat=1", { exact: true })).toBeVisible();
  await expect(
    rationUse.getByText(
      /recovery timing and charge-use behavior are not inferred/,
    ),
  ).toBeVisible();

  await page.goto("/items/training-grog/");
  const grogUse = page.getByRole("region", { name: "Use metadata" });
  await expect(grogUse.getByText("Mana", { exact: true })).toBeVisible();
  await expect(grogUse.getByText("8", { exact: true })).toBeVisible();

  await page.goto("/items/training-wand-1/");
  const wandUse = page.getByRole("region", { name: "Use metadata" });
  await expect(
    wandUse.getByRole("heading", { name: "Wand charges" }),
  ).toBeVisible();
  await expect(wandUse.getByText("Minimum", { exact: true })).toBeVisible();
  await expect(wandUse.getByText("2", { exact: true })).toBeVisible();
  await expect(wandUse.getByText("Maximum", { exact: true })).toBeVisible();
  await expect(wandUse.getByText("4", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await page.goto("/items/clarity-tonic/");
  await expect(
    page
      .getByRole("region", { name: "Use metadata" })
      .getByText(
        "No normalized weapon, armour, macguffin, toolkit, recovery, charge, or trap metadata.",
      ),
  ).toBeVisible();
});

test("shows linked macguffin source metadata without inferring behavior", async ({
  page,
}) => {
  await page.goto("/items/training-relic/");
  const useMetadata = page.getByRole("region", { name: "Use metadata" });
  await expect(
    useMetadata.getByRole("heading", { name: "Macguffin declarations" }),
  ).toBeVisible();
  await expect(
    useMetadata.getByRole("link", { name: "Clockwork Echo" }),
  ).toBeVisible();
  await expect(
    useMetadata.getByText("Resolved", { exact: true }),
  ).toBeVisible();
  await expect(
    useMetadata.getByText("Training Curiosity", { exact: true }),
  ).toBeVisible();
  await expect(useMetadata.getByText("No", { exact: true })).toBeVisible();
  await expect(
    useMetadata.getByText(
      /whether the item is actually consumed are not inferred/i,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Unsupported <macguffin> element was preserved only as a diagnostic.",
    ),
  ).toHaveCount(0);

  await useMetadata.getByRole("link", { name: "Clockwork Echo" }).click();
  await expect(page).toHaveURL(/\/spells\/clockwork-echo\/$/);
  const backlinks = page.getByRole("region", { name: "Referenced by" });
  await expect(
    backlinks
      .getByRole("region", { name: "Item macguffins" })
      .getByRole("link", { name: "Training Relic" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("shows toolkit metadata and navigates crafting tool relationships", async ({
  page,
}) => {
  await page.goto("/items/training-smithing-kit/");
  const useMetadata = page.getByRole("region", { name: "Use metadata" });
  await expect(
    useMetadata.getByRole("heading", { name: "Toolkit declarations" }),
  ).toBeVisible();
  await expect(
    useMetadata.getByText("smithing", { exact: true }),
  ).toBeVisible();
  await expect(
    useMetadata
      .getByText("Sound cue", { exact: true })
      .locator("..")
      .getByText("Supplied", { exact: true }),
  ).toBeVisible();
  await expect(
    useMetadata.getByText("3 references supplied", { exact: true }),
  ).toBeVisible();
  await expect(
    useMetadata.getByText("2 slots supplied", { exact: true }),
  ).toBeVisible();
  await expect(
    useMetadata.getByText("4 coordinates supplied", { exact: true }),
  ).toBeVisible();
  await expect(
    useMetadata.getByText("3 controls supplied", { exact: true }),
  ).toBeVisible();
  await expect(
    useMetadata.getByText(/do not control this site's UI/i),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Unsupported <toolkit> element was preserved only as a diagnostic.",
    ),
  ).toHaveCount(0);
  expect(await page.locator("body").textContent()).not.toContain(
    "assets/synthetic.svg",
  );
  expect(await page.locator("body").textContent()).not.toContain(
    "training_smithing",
  );

  const craftingRelationships = page.getByRole("region", {
    name: "Crafting relationships",
  });
  await expect(
    craftingRelationships.getByRole("heading", {
      name: "Crafted with this toolkit",
    }),
  ).toBeVisible();
  const recipeLink = craftingRelationships.getByRole("link", {
    name: "Clockwork Blade Recipe",
  });
  await recipeLink.focus();
  await expect(recipeLink).toBeFocused();
  await recipeLink.press("Enter");
  await expect(page).toHaveURL(/\/recipes\/clockwork-blade-recipe\/$/);
  const recipeToolLink = page
    .getByText("Tool", { exact: true })
    .locator("..")
    .getByRole("link", { name: "Training Smithing Kit" });
  await expect(recipeToolLink).toBeVisible();

  await page.goto("/items/training-smithing-kit/");
  const encrustmentLink = page
    .getByRole("region", { name: "Encrusting relationships" })
    .getByRole("link", { name: "Synthetic Gear Polish" });
  await expect(encrustmentLink).toBeVisible();
  await encrustmentLink.click();
  await expect(page).toHaveURL(/\/encrustments\/synthetic-gear-polish\/$/);
  await expect(
    page
      .getByText("Tool", { exact: true })
      .locator("..")
      .getByRole("link", { name: "Training Smithing Kit" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("navigates skill, ability, loadout, and spell relationships", async ({
  page,
}) => {
  await page.goto("/items/brass-ingot/");
  const spellListBacklinks = page.getByRole("region", {
    name: "Spell item-list relationships",
  });
  await expect(
    spellListBacklinks.getByRole("link", { name: "Clockwork Spark" }),
  ).toBeVisible();
  await expect(
    spellListBacklinks.getByText(/Source amount: not declared/),
  ).toBeVisible();
  await expect(
    spellListBacklinks.getByText(/runtime spawning are not inferred/i),
  ).toBeVisible();
  const directItemBacklinks = page.getByRole("region", {
    name: "Spell direct-item relationships",
  });
  await expect(
    directItemBacklinks.getByRole("link", { name: "Clockwork Spark" }),
  ).toBeVisible();
  await expect(
    directItemBacklinks.getByText(/Spawn effect.*Source amount: 2/),
  ).toBeVisible();
  await expect(
    directItemBacklinks.getByText(/random-item selectors/i),
  ).toBeVisible();
  const loadoutBacklinks = page.getByRole("region", {
    name: "Starting loadout relationships",
  });
  const skillLink = loadoutBacklinks.getByRole("link", {
    name: "Clockwork Combat",
  });
  await expect(loadoutBacklinks.getByText("1 × always included")).toBeVisible();
  await skillLink.focus();
  await expect(skillLink).toBeFocused();
  await skillLink.press("Enter");
  await expect(page).toHaveURL(/\/skills\/clockwork-combat\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Clockwork Combat" }),
  ).toBeVisible();
  await expect(page.getByTestId("skill-icon-placeholder")).toBeVisible();
  await expect(page.locator(".detail-header img")).toHaveCount(0);

  const loadout = page.getByRole("region", {
    name: "Starting loadout",
    exact: true,
  });
  await expect(
    loadout.getByRole("link", { name: "Brass Ingot" }),
  ).toBeVisible();
  await expect(loadout.getByText("Missing Kit", { exact: true })).toBeVisible();
  await expect(loadout.getByText("Unresolved item")).toBeVisible();
  await expect(loadout.getByText("Random Food", { exact: true })).toBeVisible();

  const skillMetadata = page.getByRole("region", {
    name: "Progression metadata",
    exact: true,
  });
  await expect(skillMetadata.getByText("Clockwork Trainee")).toBeVisible();
  await expect(skillMetadata.getByText("Level 0")).toBeVisible();
  await expect(skillMetadata.getByText("Clockwork Mechanist")).toBeVisible();
  await expect(skillMetadata.getByText("Level 1")).toBeVisible();
  await expect(skillMetadata.getByText("Friendly taxonomy")).toBeVisible();
  await expect(skillMetadata.getByText("Construct")).toBeVisible();
  await expect(skillMetadata.getByText("Training Mode")).toBeVisible();

  const abilities = page.getByRole("region", {
    name: "Abilities",
    exact: true,
  });
  await expect(abilities.getByText("Starting ability")).toBeVisible();
  await expect(abilities.getByText("Level 1")).toBeVisible();
  await abilities.getByRole("link", { name: "Measured Strike" }).click();
  await expect(page).toHaveURL(/\/abilities\/measured-strike\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Measured Strike" }),
  ).toBeVisible();
  await expect(page.getByTestId("ability-icon-placeholder")).toBeVisible();
  await expect(page.locator(".detail-header img")).toHaveCount(0);

  const modifiers = page.getByRole("region", {
    name: "Direct modifiers",
    exact: true,
  });
  await expect(modifiers.getByText("Crushing damage")).toBeVisible();
  await expect(modifiers.getByText("+2", { exact: true })).toBeVisible();
  await expect(modifiers.getByText("Voltaic damage")).toBeVisible();
  await expect(modifiers.getByText("-1", { exact: true })).toBeVisible();
  await expect(modifiers.getByText("Toxic resistance")).toBeVisible();
  await expect(modifiers.getByText("Primary attribute 2")).toBeVisible();
  await expect(modifiers.getByText("Secondary stat 6")).toBeVisible();
  await expect(
    modifiers.getByText(/retain their numeric game stat IDs/),
  ).toBeVisible();

  const abilityMetadata = page.getByRole("region", {
    name: "Source metadata",
    exact: true,
  });
  await expect(abilityMetadata.getByText("Recovery buff amount")).toBeVisible();
  await expect(abilityMetadata.getByText("+5", { exact: true })).toBeVisible();
  await expect(
    abilityMetadata.getByText("Currency buff percent"),
  ).toBeVisible();
  await expect(abilityMetadata.getByText("0.1", { exact: true })).toBeVisible();
  await expect(abilityMetadata.getByText("Training Mode")).toBeVisible();
  await expect(abilityMetadata.getByText("Enabled")).toBeVisible();

  const triggers = page.getByRole("region", {
    name: "Spell triggers",
    exact: true,
  });
  await expect(
    triggers.getByRole("link", { name: "Clockwork Spark" }),
  ).toBeVisible();
  await expect(triggers.getByText("When you dodge")).toBeVisible();
  await expect(triggers.getByText("30%", { exact: true })).toBeVisible();
  await expect(
    triggers.getByRole("link", { name: "Clockwork Echo" }),
  ).toBeVisible();
  await expect(
    triggers.getByText("Missing Ability Spell", { exact: true }),
  ).toBeVisible();
  await expect(triggers.getByText("Unresolved spell reference")).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Skill progression" })
      .getByRole("link", { name: "Clockwork Combat" }),
  ).toBeVisible();

  await triggers.getByRole("link", { name: "Clockwork Spark" }).click();
  await expect(page).toHaveURL(/\/spells\/clockwork-spark\/$/);
  await expect(page.getByTestId("spell-icon-placeholder")).toBeVisible();
  await expect(page.locator(".detail-header img")).toHaveCount(0);
  await expect(
    page
      .getByRole("region", { name: "Referenced by" })
      .getByRole("link", { name: "Measured Strike" }),
  ).toBeVisible();
  const spellEffects = page.getByRole("region", { name: "Effects" });
  const summonLink = spellEffects.getByRole("link", {
    name: "Training Diggle",
  });
  await expect(
    spellEffects.getByText("Resolved summon monster target"),
  ).toBeVisible();
  await summonLink.focus();
  await expect(summonLink).toBeFocused();
  await summonLink.press("Enter");
  await expect(page).toHaveURL(/\/monsters\/training-diggle\/$/);
  await expect(page.getByTestId("monster-icon-placeholder")).toBeVisible();
  await expect(page.locator(".detail-header img")).toHaveCount(0);
  const summonBacklinks = page.getByRole("region", {
    name: "Summoned by spells",
  });
  await expect(
    summonBacklinks.getByRole("link", { name: "Clockwork Spark" }),
  ).toBeVisible();
  await expect(
    summonBacklinks.getByText(/Summon effect.*Source amount: 1/),
  ).toBeVisible();
  await expect(
    summonBacklinks.getByText(/allegiance, placement, lifetime, AI state/i),
  ).toBeVisible();
  const polymorphBacklinks = page.getByRole("region", {
    name: "Polymorph target of spells",
  });
  await expect(
    polymorphBacklinks.getByRole("link", { name: "Clockwork Spark" }),
  ).toBeVisible();
  await expect(
    polymorphBacklinks.getByText("Buff 1 · Declaration 1", { exact: true }),
  ).toBeVisible();
  await expect(
    polymorphBacklinks.getByText(/do not establish duration, stat or ability/i),
  ).toBeVisible();

  await page.goto("/abilities/clockwork-followthrough/");
  const eventTrigger = page.getByRole("region", {
    name: "Spell triggers",
    exact: true,
  });
  await expect(eventTrigger.getByText("When you hit in melee")).toBeVisible();
  await expect(eventTrigger.getByText("25%", { exact: true })).toBeVisible();
  await expect(
    eventTrigger.getByRole("link", { name: "Clockwork Echo" }),
  ).toBeVisible();
});

test("shows inherited monster stats and navigates its family", async ({
  page,
}) => {
  await page.goto("/monsters/armored-training-diggle/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Armored Training Diggle",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Dungeon level 2", { exact: true }),
  ).toBeVisible();

  const profile = page.getByRole("region", { name: "Combat profile" });
  await expect(profile.getByText("Fighter level")).toBeVisible();
  await expect(profile.getByText("2", { exact: true })).toBeVisible();
  await expect(profile.getByText("Experience value")).toBeVisible();
  await expect(profile.getByText("10", { exact: true })).toBeVisible();
  await expect(
    profile.getByText(/disputed secondary combat totals remain unavailable/i),
  ).toBeVisible();

  const primaryAttributes = page.getByRole("region", {
    name: "Verified primary attributes",
  });
  await expect(
    primaryAttributes.getByText("Burliness").locator("..").getByText("4"),
  ).toBeVisible();
  await expect(
    primaryAttributes.getByText("Sagacity").locator("..").getByText("2"),
  ).toBeVisible();
  await expect(
    primaryAttributes
      .getByText("Nimbleness")
      .locator("..")
      .getByText("3 (2 + 1)"),
  ).toBeVisible();
  await expect(
    primaryAttributes.getByText("Caddishness").locator("..").getByText("4"),
  ).toBeVisible();
  await expect(
    primaryAttributes.getByText("Stubbornness").locator("..").getByText("4"),
  ).toBeVisible();
  await expect(
    primaryAttributes.getByText("Savvy").locator("..").getByText("2"),
  ).toBeVisible();
  await expect(
    primaryAttributes.getByText(/available sources conflict/i),
  ).toBeVisible();

  const aiMetadata = page.getByRole("region", { name: "AI source metadata" });
  await expect(aiMetadata.getByText("Aggressiveness")).toBeVisible();
  await expect(aiMetadata.getByText("4", { exact: true })).toBeVisible();
  await expect(aiMetadata.getByText("Span")).toBeVisible();
  await expect(aiMetadata.getByText("10", { exact: true })).toBeVisible();
  const invisibleMetadata = aiMetadata
    .getByText("Invisible source flag")
    .locator("..");
  await expect(
    invisibleMetadata.getByText("Enabled", { exact: true }),
  ).toBeVisible();
  const chickenMetadata = aiMetadata
    .getByText("Chicken source flag")
    .locator("..");
  await expect(
    chickenMetadata.getByText("Enabled", { exact: true }),
  ).toBeVisible();
  const charmMetadata = aiMetadata
    .getByText("Can charm source flag")
    .locator("..");
  await expect(
    charmMetadata.getByText("Disabled", { exact: true }),
  ).toBeVisible();
  const paralyzeMetadata = aiMetadata
    .getByText("Can paralyze source flag")
    .locator("..");
  await expect(
    paralyzeMetadata.getByText("Disabled", { exact: true }),
  ).toBeVisible();
  const stealGoldMetadata = aiMetadata
    .getByText("Steal gold source flag")
    .locator("..");
  await expect(
    stealGoldMetadata.getByText("Enabled", { exact: true }),
  ).toBeVisible();
  const stealPercentageMetadata = aiMetadata
    .getByText("Steal percentage")
    .locator("..");
  await expect(
    stealPercentageMetadata.getByText("20%", { exact: true }),
  ).toBeVisible();
  await expect(
    aiMetadata.getByText(/gameplay behavior is not inferred/i),
  ).toBeVisible();

  const sightMetadata = page.getByRole("region", {
    name: "Sight source metadata",
  });
  await expect(sightMetadata.getByText("Sight cone")).toBeVisible();
  await expect(sightMetadata.getByText("270", { exact: true })).toBeVisible();
  await expect(sightMetadata.getByText("Sight modifier")).toBeVisible();
  await expect(sightMetadata.getByText("1.25", { exact: true })).toBeVisible();
  await expect(
    sightMetadata.getByText(/without inferring their gameplay behavior/i),
  ).toBeVisible();

  const movementMetadata = page.getByRole("region", {
    name: "Movement source metadata",
  });
  const digMetadata = movementMetadata.getByRole("region", { name: "Dig" });
  await expect(
    digMetadata.getByText("Chance").locator("..").getByText("40%"),
  ).toBeVisible();
  await expect(
    digMetadata.getByText("Ambush chance").locator("..").getByText("25%"),
  ).toBeVisible();
  const dashMetadata = movementMetadata.getByRole("region", { name: "Dash" });
  await expect(
    dashMetadata.getByText("Chance").locator("..").getByText("75%"),
  ).toBeVisible();
  await expect(
    dashMetadata
      .getByText("Interruptible source flag")
      .locator("..")
      .getByText("Enabled"),
  ).toBeVisible();
  const chargeMetadata = movementMetadata.getByRole("region", {
    name: "Charge",
  });
  await expect(
    chargeMetadata.getByText("Chance").locator("..").getByText("15%"),
  ).toBeVisible();
  await expect(
    chargeMetadata
      .getByText("Interruptible source flag")
      .locator("..")
      .getByText("Disabled"),
  ).toBeVisible();
  await expect(
    chargeMetadata
      .getByText("Blocks action source flag")
      .locator("..")
      .getByText("Enabled"),
  ).toBeVisible();
  await expect(
    chargeMetadata
      .getByText("Targets self source flag")
      .locator("..")
      .getByText("Disabled"),
  ).toBeVisible();
  await expect(
    movementMetadata.getByText(/no complete movement behavior is inferred/i),
  ).toBeVisible();

  const presentationMetadata = page.getByRole("region", {
    name: "Presentation source coverage",
  });
  await expect(
    presentationMetadata.getByText(
      "attack, death, hit, spell, dig in, dig out",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    presentationMetadata.getByText("4 references supplied", { exact: true }),
  ).toHaveCount(3);
  await expect(
    presentationMetadata.getByText("1 reference supplied", { exact: true }),
  ).toHaveCount(2);
  await expect(
    presentationMetadata.getByText("6 references supplied", { exact: true }),
  ).toBeVisible();
  await expect(
    presentationMetadata.getByText("2 references supplied", { exact: true }),
  ).toBeVisible();
  await expect(
    presentationMetadata.getByText(/do not inherit from a parent monster/i),
  ).toBeVisible();
  await expect(presentationMetadata).not.toContainText("assets/synthetic.svg");

  const bonuses = page.getByRole("region", { name: "Stat bonuses" });
  await expect(bonuses.getByText("Crushing damage")).toBeVisible();
  await expect(bonuses.getByText("+3", { exact: true })).toBeVisible();
  await expect(bonuses.getByText("Voltaic damage")).toBeVisible();
  await expect(bonuses.getByText("-1", { exact: true })).toBeVisible();
  await expect(bonuses.getByText("Toxic resistance")).toBeVisible();
  await expect(bonuses.getByText("Primary attribute 2")).toBeVisible();
  await expect(bonuses.getByText("Secondary stat 6")).toBeVisible();

  const spellHooks = page.getByRole("region", { name: "Spell hooks" });
  await expect(spellHooks.getByText("When aware of the player")).toBeVisible();
  await expect(spellHooks.getByText("20%", { exact: true })).toBeVisible();
  await expect(
    spellHooks.getByRole("link", { name: "Clockwork Echo" }),
  ).toHaveCount(2);
  await expect(spellHooks.getByText("When its attack hits")).toBeVisible();
  await expect(
    spellHooks.getByText("1 in 3 (about 33%)", { exact: true }),
  ).toBeVisible();
  await expect(
    spellHooks.getByText("Missing Monster Spell", { exact: true }),
  ).toBeVisible();
  await expect(spellHooks.getByText("Unresolved spell reference")).toHaveCount(
    2,
  );
  await expect(spellHooks.getByText("When defeated")).toBeVisible();
  await expect(spellHooks.getByText("When a dash hits")).toBeVisible();
  await expect(spellHooks.getByText("When a dash misses")).toBeVisible();
  await expect(spellHooks.getByText("During a charge")).toBeVisible();
  await expect(
    spellHooks.getByRole("link", { name: "Clockwork Spark" }),
  ).toHaveCount(2);
  await expect(
    spellHooks.getByText("Missing Dash Spell", { exact: true }),
  ).toBeVisible();

  const drops = page.getByRole("region", { name: "Drops on defeat" });
  await expect(
    drops.getByRole("link", { name: "Clockwork Blade" }),
  ).toBeVisible();
  await expect(drops.getByText("40%", { exact: true })).toBeVisible();
  await expect(
    drops.getByText("Missing Monster Loot", { exact: true }),
  ).toBeVisible();
  await expect(drops.getByText("Unresolved item reference")).toBeVisible();
  await expect(drops.getByRole("link", { name: "Brass Ingot" })).toHaveCount(0);

  await drops.getByRole("link", { name: "Clockwork Blade" }).click();
  await expect(page).toHaveURL(/\/items\/clockwork-blade\/$/);
  const monsterDrops = page.getByRole("region", {
    name: "Monster drop relationships",
  });
  await expect(
    monsterDrops.getByRole("link", { name: "Armored Training Diggle" }),
  ).toBeVisible();
  await expect(
    monsterDrops.getByText("40% on defeat", { exact: true }),
  ).toBeVisible();
  await monsterDrops
    .getByRole("link", { name: "Armored Training Diggle" })
    .click();
  await expect(page).toHaveURL(/\/monsters\/armored-training-diggle\/$/);

  await spellHooks
    .getByText("When aware of the player")
    .locator("..")
    .getByRole("link", { name: "Clockwork Echo" })
    .click();
  await expect(page).toHaveURL(/\/spells\/clockwork-echo\/$/);
  const backlinks = page.getByRole("region", { name: "Referenced by" });
  await expect(
    backlinks.getByRole("link", { name: "Armored Training Diggle" }),
  ).toHaveCount(2);
  await expect(backlinks.getByText("Aware-casting spell")).toBeVisible();
  await expect(backlinks.getByText("Charge spell")).toBeVisible();
  await expect(
    backlinks.getByRole("link", { name: "Training Diggle", exact: true }),
  ).toBeVisible();

  await page.goto("/monsters/armored-training-diggle/");
  const family = page.getByRole("region", { name: "Monster family" });
  const parentLink = family.getByRole("link", { name: "Training Diggle" });
  await parentLink.focus();
  await expect(parentLink).toBeFocused();
  await parentLink.press("Enter");
  await expect(page).toHaveURL(/\/monsters\/training-diggle\/$/);
  await expect(
    page
      .getByRole("region", { name: "Monster family" })
      .getByRole("link", { name: "Armored Training Diggle" }),
  ).toBeVisible();
  const parentAiMetadata = page.getByRole("region", {
    name: "AI source metadata",
  });
  await expect(
    parentAiMetadata.getByText("Not supplied", { exact: true }),
  ).toHaveCount(6);
  await expect(
    page
      .getByRole("region", { name: "Sight source metadata" })
      .getByText("Not supplied", { exact: true }),
  ).toHaveCount(2);
  await expect(
    page
      .getByRole("region", { name: "Movement source metadata" })
      .getByText("Not supplied", { exact: true }),
  ).toHaveCount(3);
  await expect(
    page
      .getByRole("region", { name: "Presentation source coverage" })
      .getByText("Not supplied", { exact: true }),
  ).toHaveCount(8);
  const parentDrops = page.getByRole("region", { name: "Drops on defeat" });
  await expect(
    parentDrops.getByRole("link", { name: "Brass Ingot" }),
  ).toBeVisible();
  await expect(parentDrops.getByText("75%", { exact: true })).toBeVisible();
  await expect(
    parentDrops.getByText("Artifact", { exact: true }),
  ).toBeVisible();
  await expect(parentDrops.getByText("Game-defined drop type")).toBeVisible();
  await expect(
    parentDrops.getByText("Always (100%)", { exact: true }),
  ).toBeVisible();
});

test("representative pages have no automatically detectable accessibility violations", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/dataset/",
    "/browse/",
    "/browse/spells/1/",
    "/crafts/",
    "/crafts/tool/smithing/",
    "/search/",
    "/search/?q=clokwork+blade",
    "/items/clockwork-blade/",
    "/items/clockwork-blade-plus/",
    "/items/clockwork-sword/",
    "/items/training-cuirass/",
    "/items/training-relic/",
    "/items/training-smithing-kit/",
    "/items/training-ration/",
    "/items/training-trap/",
    "/items/training-wand-1/",
    "/encrustments/synthetic-gear-polish/",
    "/recipes/clockwork-blade-recipe/",
    "/skills/clockwork-combat/",
    "/abilities/measured-strike/",
    "/abilities/clockwork-followthrough/",
    "/spells/clockwork-spark/",
    "/monsters/armored-training-diggle/",
    "/meta/required-armour-by-monster/",
    "/tools/crafting-graph/?item=clockwork-blade",
    "/tools/encrusting-plan/?encrustment=synthetic-gear-polish",
    "/tools/item-compare/?item=clockwork-blade&item=training-cuirass",
    "/stats/melee-power/",
    "/templates/small-cross/",
    "/spells/not-in-active-dataset/",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  }
});
