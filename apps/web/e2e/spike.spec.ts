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
  await expect(page.getByText("Quality 3", { exact: true })).toBeVisible();

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
  await expect(page.getByText("Quality")).toBeVisible();
  await expect(page.getByText("3", { exact: true })).toBeVisible();
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

test("shows resolved and unresolved item spell triggers", async ({ page }) => {
  await page.goto("/items/clockwork-blade/");
  const weaponTriggers = page.getByRole("region", { name: "Triggers" });
  await expect(weaponTriggers.getByText("When the item hits")).toBeVisible();
  await expect(
    weaponTriggers.getByText("Clockwork Spark", { exact: true }),
  ).toBeVisible();
  await expect(weaponTriggers.getByText("Resolved target spell")).toBeVisible();

  await page.goto("/items/training-cuirass/");
  const armourTriggers = page.getByRole("region", { name: "Triggers" });
  await expect(armourTriggers.getByText("25%", { exact: true })).toBeVisible();
  await expect(armourTriggers.getByText("50%", { exact: true })).toBeVisible();
  await expect(armourTriggers.getByText("3 turns")).toBeVisible();
  await expect(armourTriggers.getByText("Animal")).toBeVisible();
  await expect(armourTriggers.getByText("Unresistable")).toBeVisible();

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
  ).toBeVisible();
});

test("navigates spell details and stops recursive effect cycles", async ({
  page,
}) => {
  await page.goto("/items/clockwork-blade/");
  const weaponTriggers = page.getByRole("region", { name: "Triggers" });
  const spellLink = weaponTriggers.getByRole("link", {
    name: "Clockwork Spark",
  });
  await spellLink.focus();
  await expect(spellLink).toBeFocused();
  await spellLink.press("Enter");
  await expect(page).toHaveURL(/\/spells\/clockwork-spark\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Clockwork Spark" }),
  ).toBeVisible();

  const effects = page.getByRole("region", { name: "Effects", exact: true });
  await expect(
    effects.getByRole("link", { name: "Clockwork Echo" }),
  ).toBeVisible();
  await expect(
    effects.getByText("Missing Echo", { exact: true }),
  ).toBeVisible();
  await expect(effects.getByText("Unresolved spell target")).toBeVisible();

  const chain = page.getByRole("region", { name: "Effect chain" });
  await expect(chain.getByText("Cycle detected")).toBeVisible();
  await expect(chain.getByText("Unresolved target")).toBeVisible();

  const backlinks = page.getByRole("region", { name: "Referenced by" });
  await expect(
    backlinks.getByRole("link", { name: "Clockwork Blade" }),
  ).toBeVisible();
  await expect(backlinks.getByText("Synthetic Mishap")).toBeVisible();

  await effects.getByRole("link", { name: "Clockwork Echo" }).click();
  await expect(page).toHaveURL(/\/spells\/clockwork-echo\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Clockwork Echo" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Referenced by" })
      .getByRole("link", { name: "Clockwork Spark" }),
  ).toBeVisible();
});

test("navigates skill, ability, loadout, and spell relationships", async ({
  page,
}) => {
  await page.goto("/items/brass-ingot/");
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
  await expect(
    page
      .getByRole("region", { name: "Referenced by" })
      .getByRole("link", { name: "Measured Strike" }),
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
    profile.getByText(/derived combat totals are not calculated/i),
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
    "/search/",
    "/items/clockwork-blade/",
    "/items/clockwork-blade-plus/",
    "/items/clockwork-sword/",
    "/items/training-cuirass/",
    "/items/training-trap/",
    "/encrustments/synthetic-gear-polish/",
    "/recipes/clockwork-blade-recipe/",
    "/skills/clockwork-combat/",
    "/abilities/measured-strike/",
    "/abilities/clockwork-followthrough/",
    "/spells/clockwork-spark/",
    "/monsters/armored-training-diggle/",
    "/stats/melee-power/",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  }
});
