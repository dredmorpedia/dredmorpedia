import { expect, test } from "@playwright/test";

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

  const manaCost = page.getByRole("region", { name: "Mana cost" });
  await expect(
    manaCost.getByText("12 − (0.25 × Savvy), minimum 4"),
  ).toBeVisible();
  await expect(
    manaCost.getByText("0.25 × Savvy", { exact: true }),
  ).toBeVisible();
  await expect(
    manaCost.getByText(
      "These are source parameters. Final in-game rounding is not inferred.",
    ),
  ).toBeVisible();

  const presentation = page.getByRole("region", {
    name: "Presentation",
    exact: true,
  });
  const animationDeclaration = presentation
    .getByRole("listitem")
    .filter({ hasText: "Animation declaration 1" });
  const impactDeclaration = presentation
    .getByRole("listitem")
    .filter({ hasText: "Impact declaration 1" });
  await expect(presentation.getByText("6 source frames")).toBeVisible();
  await expect(
    animationDeclaration.getByText("Sprite reference", { exact: true }),
  ).toBeVisible();
  await expect(
    animationDeclaration.getByText("Sound cue", { exact: true }),
  ).toBeVisible();
  await expect(
    animationDeclaration.getByText("80", { exact: true }),
  ).toBeVisible();
  await expect(
    animationDeclaration.getByText("Centered effect", { exact: true }),
  ).toBeVisible();
  await expect(
    animationDeclaration.getByText("Synchronized", { exact: true }),
  ).toBeVisible();
  await expect(
    impactDeclaration.getByText("Impact declaration 1", { exact: true }),
  ).toBeVisible();
  await expect(impactDeclaration.getByText("5 source frames")).toBeVisible();
  await expect(
    impactDeclaration.getByText("70", { exact: true }),
  ).toBeVisible();
  await expect(
    presentation.getByText(
      /detailed sprite paths and sound cue ids remain hidden/i,
    ),
  ).toBeVisible();
  await expect(presentation).not.toContainText(
    "sprites/sfx/synthetic/synthetic",
  );
  await expect(presentation).not.toContainText("clockwork_animation_audio_cue");
  await expect(presentation).not.toContainText(
    "sprites/sfx/synthetic-impact/synthetic-impact",
  );
  await expect(presentation).not.toContainText("clockwork_impact_audio_cue");

  const aiHints = page.getByRole("region", { name: "Engine AI hints" });
  await expect(
    aiHints.getByText("Spell declaration 1", { exact: true }),
  ).toBeVisible();
  await expect(aiHints.getByText("target", { exact: true })).toBeVisible();
  await expect(
    aiHints.getByText("Buff 1 declaration 1", { exact: true }),
  ).toBeVisible();
  await expect(aiHints.getByText("self", { exact: true })).toBeVisible();
  await expect(
    aiHints.getByText(/uninterpreted engine guidance tokens/i),
  ).toBeVisible();

  const buffs = page.getByRole("region", { name: "Buffs" });
  await expect(
    buffs.getByRole("region", { name: "Buff description" }),
  ).toContainText("A measured clockwork ward surrounds the caster.");
  const haloPresentation = buffs.getByRole("region", {
    name: "Halo presentation",
  });
  await expect(haloPresentation.getByText("4 source frames")).toBeVisible();
  await expect(
    haloPresentation.getByText("Sprite reference", { exact: true }),
  ).toBeVisible();
  await expect(
    haloPresentation.getByText("120", { exact: true }),
  ).toBeVisible();
  await expect(
    haloPresentation.getByText("Centered effect", { exact: true }),
  ).toBeVisible();
  await expect(
    haloPresentation.getByText(/not animation timing formulas/i),
  ).toBeVisible();
  await expect(haloPresentation).not.toContainText(
    "sprites/sfx/clockwork-ward/clockwork-ward",
  );
  await expect(buffs.getByText("8 turn duration")).toBeVisible();
  await expect(buffs.getByText("1 mana every 3 turns")).toBeVisible();
  await expect(buffs.getByText("2 hits")).toBeVisible();
  await expect(buffs.getByText("4 attacks")).toBeVisible();
  await expect(buffs.getByText("Crushing damage")).toBeVisible();
  await expect(buffs.getByText("+2", { exact: true })).toBeVisible();
  await expect(buffs.getByText("Voltaic damage")).toBeVisible();
  await expect(buffs.getByText("-1", { exact: true })).toBeVisible();
  await expect(buffs.getByText("Toxic resistance")).toBeVisible();
  await expect(buffs.getByText("Primary attribute 2")).toBeVisible();
  await expect(buffs.getByText("Secondary stat 6")).toBeVisible();
  const sightModifiers = buffs.getByRole("region", {
    name: "Sight modifiers",
  });
  await expect(sightModifiers.getByText("Sight radius")).toBeVisible();
  await expect(sightModifiers.getByText("-2", { exact: true })).toBeVisible();
  await expect(
    sightModifiers.getByText(/without deriving final visibility/),
  ).toBeVisible();
  const buffEventHooks = buffs.getByRole("region", { name: "Event hooks" });
  await expect(
    buffEventHooks.getByRole("link", { name: "Clockwork Echo" }),
  ).toBeVisible();
  await expect(buffEventHooks.getByText("When you hit in melee")).toBeVisible();
  await expect(buffEventHooks.getByText("40% chance")).toBeVisible();
  await expect(buffEventHooks.getByText("After: Enabled")).toBeVisible();
  await expect(
    buffEventHooks.getByText("Missing Buff Echo", { exact: true }),
  ).toBeVisible();
  await expect(
    buffEventHooks.getByText("Unresolved spell target"),
  ).toBeVisible();
  await expect(
    buffs.getByText(/without inferring stacking or trigger behavior/),
  ).toBeVisible();

  const effects = page.getByRole("region", { name: "Effects", exact: true });
  await expect(
    effects.getByRole("link", { name: "Clockwork Echo" }),
  ).toBeVisible();
  await expect(
    effects.getByText("Missing Echo", { exact: true }),
  ).toBeVisible();
  await expect(effects.getByText("Unresolved spell target")).toBeVisible();
  const controlledEffect = effects
    .getByRole("listitem")
    .filter({ hasText: "Damage effect" })
    .first();
  await expect(
    controlledEffect
      .getByText("Source chance", { exact: true })
      .locator("..")
      .getByText("40%", { exact: true }),
  ).toBeVisible();
  await expect(
    controlledEffect
      .getByText("Blasting damage", { exact: true })
      .locator("..")
      .getByText("+3 base · 0.25 factor", { exact: true }),
  ).toBeVisible();
  await expect(
    controlledEffect
      .getByText("Crushing damage", { exact: true })
      .locator("..")
      .getByText("Base not declared or unavailable · 0.5 factor", {
        exact: true,
      }),
  ).toBeVisible();
  await expect(
    controlledEffect
      .getByText("Secondary scaling source ID", { exact: true })
      .locator("..")
      .getByText("6", { exact: true }),
  ).toBeVisible();
  await expect(
    controlledEffect
      .getByText("Affects caster", { exact: true })
      .locator("..")
      .getByText("Yes", { exact: true }),
  ).toBeVisible();
  await expect(
    controlledEffect
      .getByText("Self flag", { exact: true })
      .locator("..")
      .getByText("No", { exact: true }),
  ).toBeVisible();
  await expect(
    controlledEffect
      .getByText("Affects corpses", { exact: true })
      .locator("..")
      .getByText("Yes", { exact: true }),
  ).toBeVisible();
  await expect(
    controlledEffect
      .getByText("Resistable", { exact: true })
      .locator("..")
      .getByText("No", { exact: true }),
  ).toBeVisible();
  await expect(
    controlledEffect
      .getByText("Burn flag", { exact: true })
      .locator("..")
      .getByText("Yes", { exact: true }),
  ).toBeVisible();
  await expect(
    controlledEffect
      .getByText("Taxonomy", { exact: true })
      .locator("..")
      .getByText("Construct", { exact: true }),
  ).toBeVisible();
  const durationEffect = effects
    .getByRole("listitem")
    .filter({ hasText: "Paralyze effect" })
    .first();
  await expect(
    durationEffect
      .getByText("Declared duration", { exact: true })
      .locator("..")
      .getByText("3 source turns", { exact: true }),
  ).toBeVisible();
  await expect(
    controlledEffect
      .getByText("Source conditions", { exact: true })
      .locator("..")
      .getByText("None declared", { exact: true }),
  ).toBeVisible();
  const requiredConditionEffect = effects
    .getByRole("listitem")
    .filter({ hasText: "Named buff required" })
    .first();
  await expect(
    requiredConditionEffect
      .getByText("Named buff required", { exact: true })
      .locator("..")
      .getByText("Yes", { exact: true }),
  ).toBeVisible();
  await expect(
    requiredConditionEffect.getByRole("link", { name: "Clockwork Spark" }),
  ).toBeVisible();
  const sourceBuffConditionEffect = effects
    .getByRole("listitem")
    .filter({ hasText: "Requires source buff" })
    .first();
  await expect(
    sourceBuffConditionEffect
      .getByText("Requires source buff", { exact: true })
      .locator("..")
      .getByText("Yes", { exact: true }),
  ).toBeVisible();
  await expect(
    effects.getByText(/without combining them into final damage/i),
  ).toBeVisible();
  await expect(
    effects.getByText("None declared", { exact: true }).first(),
  ).toBeVisible();

  const listOptions = page.getByRole("region", {
    name: "Effect list options",
  });
  await expect(
    listOptions.getByRole("heading", { name: "Spawn item from list effect" }),
  ).toBeVisible();
  await expect(
    listOptions.getByRole("link", { name: "Brass Ingot" }),
  ).toBeVisible();
  await expect(
    listOptions.getByRole("link", { name: "Training Trap" }),
  ).toBeVisible();
  await expect(
    listOptions.getByText("Missing Listed Item", { exact: true }),
  ).toBeVisible();
  await expect(
    listOptions.getByRole("link", { name: "Clockwork Echo" }),
  ).toBeVisible();
  await expect(
    listOptions.getByText("Missing Listed Spell", { exact: true }),
  ).toBeVisible();
  await expect(listOptions.getByText(/Source amount: 2/)).toBeVisible();
  await expect(
    listOptions.getByText(/selection weights, probabilities, eligibility/i),
  ).toBeVisible();

  const chain = page.getByRole("region", { name: "Effect chain" });
  await expect(chain.getByText("Cycle detected")).toBeVisible();
  await expect(chain.getByText("Unresolved target")).toBeVisible();

  const backlinks = page.getByRole("region", { name: "Referenced by" });
  await expect(
    backlinks.getByRole("link", { name: "Clockwork Blade" }),
  ).toBeVisible();
  await expect(backlinks.getByText("Synthetic Mishap")).toBeVisible();
  const conditionBacklinks = backlinks.getByRole("region", {
    name: "Conditional effect references",
  });
  await expect(
    conditionBacklinks.getByRole("link", { name: "Clockwork Spark" }),
  ).toBeVisible();
  await expect(
    conditionBacklinks.getByRole("link", { name: "Clockwork Echo" }),
  ).toBeVisible();
  await expect(
    conditionBacklinks.getByText("Required named buff"),
  ).toBeVisible();
  await expect(
    conditionBacklinks.getByText("Forbidden named buff"),
  ).toBeVisible();

  await effects.getByRole("link", { name: "Clockwork Echo" }).click();
  await expect(page).toHaveURL(/\/spells\/clockwork-echo\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Clockwork Echo" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Referenced by" })
      .getByRole("region", { name: "Spell effects" })
      .getByRole("link", { name: "Clockwork Spark" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Referenced by" })
      .getByRole("region", { name: "Spell list options" })
      .getByRole("link", { name: "Clockwork Spark" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Referenced by" })
      .getByRole("region", { name: "Spell buff event hooks" })
      .getByRole("link", { name: "Clockwork Spark" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Mana cost" })
      .getByText("No normalized mana requirement."),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Presentation" })
      .getByText("No normalized animation or impact declaration."),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Buffs" })
      .getByText("No normalized buff declaration."),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Effect list options" })
      .getByText("No normalized effect list options."),
  ).toBeVisible();
  const echoEffects = page.getByRole("region", {
    name: "Effects",
    exact: true,
  });
  await expect(
    echoEffects
      .getByText("Damage and scaling", { exact: true })
      .first()
      .locator("..")
      .getByText("None declared", { exact: true }),
  ).toBeVisible();
  const forbiddenConditionEffect = echoEffects
    .getByRole("listitem")
    .filter({ hasText: "Named buff forbidden" })
    .first();
  await expect(
    forbiddenConditionEffect
      .getByText("Named buff forbidden", { exact: true })
      .locator("..")
      .getByText("Yes", { exact: true }),
  ).toBeVisible();
  await expect(
    forbiddenConditionEffect
      .getByText("Forbidden buff", { exact: true })
      .locator("..")
      .getByRole("link", { name: "Clockwork Spark" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "A spell requirement without a mana cost remains unsupported.",
    ),
  ).toBeVisible();
});
