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
    manaCost.getByText("Requirement level source value", { exact: true }),
  ).toBeVisible();
  await expect(manaCost.getByText("1", { exact: true })).toBeVisible();
  await expect(
    manaCost.getByText(/no actor, unlock, eligibility, or progression rule/i),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Booze requirement" })
      .getByText("No normalized booze requirement."),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Zorkmid requirement" })
      .getByText("No normalized zorkmid requirement."),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Shield requirement" })
      .getByText("No normalized shield requirement."),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Weapon requirement" })
      .getByText("No normalized weapon requirement."),
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
  const invisibility = buffs.getByRole("region", {
    name: "Invisibility",
  });
  await expect(
    invisibility.getByText("Declaration 1 source amount", { exact: true }),
  ).toBeVisible();
  await expect(invisibility.getByText("1", { exact: true })).toBeVisible();
  await expect(
    invisibility.getByText(/without inferring visibility strength/i),
  ).toBeVisible();
  const castingPrevention = buffs.getByRole("region", {
    name: "Casting prevention",
  });
  await expect(
    castingPrevention.getByText("Declaration 1 source amount", { exact: true }),
  ).toBeVisible();
  await expect(castingPrevention.getByText("1", { exact: true })).toBeVisible();
  await expect(
    castingPrevention.getByText(/without inferring affected actors/i),
  ).toBeVisible();
  const polymorphTargets = buffs.getByRole("region", {
    name: "Polymorph targets",
  });
  await expect(
    polymorphTargets.getByRole("link", { name: "Training Diggle" }),
  ).toBeVisible();
  await expect(
    polymorphTargets.getByText("Resolved monster target", { exact: true }),
  ).toBeVisible();
  await expect(
    polymorphTargets.getByText(/does not establish duration, stat or ability/i),
  ).toBeVisible();
  const buffLocalEffects = buffs.getByRole("region", {
    name: "Buff-local effects",
  });
  await expect(
    buffLocalEffects.getByText("Buff effect", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    buffLocalEffects.getByText(/Icon references supplied/),
  ).toBeVisible();
  await expect(buffLocalEffects.getByText(/5 source frames/)).toBeVisible();
  await expect(
    buffLocalEffects.getByText(/without inferring scheduling, trigger order/i),
  ).toBeVisible();
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
  const wallSensing = buffs.getByRole("region", { name: "Wall sensing" });
  await expect(wallSensing.getByText("Yes", { exact: true })).toBeVisible();
  await expect(
    wallSensing.getByText(/without inferring detection range/i),
  ).toBeVisible();
  const payback = buffs.getByRole("region", {
    name: "Payback source parameters",
  });
  await expect(
    payback.getByText("Declaration 1 secondaryScale flag", { exact: true }),
  ).toBeVisible();
  await expect(payback.getByText("No", { exact: true })).toBeVisible();
  await expect(
    payback.getByText("Declaration 1 paybackF factor", { exact: true }),
  ).toBeVisible();
  await expect(payback.getByText("0.1", { exact: true })).toBeVisible();
  await expect(
    payback.getByText(/without inferring a base amount or source stat/i),
  ).toBeVisible();
  await expect(payback.getByRole("link")).toHaveCount(0);
  const zorkmidAbsorption = buffs.getByRole("region", {
    name: "Zorkmid absorption source parameters",
  });
  await expect(
    zorkmidAbsorption.getByText("Declaration 1 zorkmidsPerDamage", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    zorkmidAbsorption.getByText("30", { exact: true }),
  ).toBeVisible();
  await expect(
    zorkmidAbsorption.getByText("Declaration 1 damageCap", { exact: true }),
  ).toBeVisible();
  await expect(
    zorkmidAbsorption.getByText("20", { exact: true }),
  ).toBeVisible();
  await expect(
    zorkmidAbsorption.getByText("Declaration 1 maxRatio", { exact: true }),
  ).toBeVisible();
  await expect(
    zorkmidAbsorption.getByText("0.5", { exact: true }),
  ).toBeVisible();
  await expect(
    zorkmidAbsorption.getByText(/without deriving a currency cost/i),
  ).toBeVisible();
  await expect(zorkmidAbsorption.getByRole("link")).toHaveCount(0);
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
  await expect(buffEventHooks.getByText("When you dodge")).toBeVisible();
  await expect(
    buffEventHooks.getByRole("link", { name: "Clockwork Spark" }),
  ).toBeVisible();
  await expect(buffEventHooks.getByText("100% chance")).toBeVisible();
  await expect(
    buffEventHooks.getByText(/do not establish event eligibility/i),
  ).toBeVisible();
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
  const directItemEffect = effects
    .getByRole("listitem")
    .filter({ hasText: "Spawn effect" })
    .first();
  await expect(
    directItemEffect.getByRole("link", { name: "Brass Ingot" }),
  ).toBeVisible();
  await expect(
    directItemEffect.getByText("Resolved item target", { exact: true }),
  ).toBeVisible();
  const sourceItemEffect = effects
    .getByRole("listitem")
    .filter({ hasText: "Spawn item at location effect" })
    .first();
  await expect(
    sourceItemEffect.getByText("randomring", { exact: true }),
  ).toBeVisible();
  await expect(
    sourceItemEffect.getByText(
      "Source item target (no normalized item entity)",
      { exact: true },
    ),
  ).toBeVisible();
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
      .getByText("After source flag", { exact: true })
      .locator("..")
      .getByText("No", { exact: true }),
  ).toBeVisible();
  await expect(
    controlledEffect
      .getByText("Starts bleeding", { exact: true })
      .locator("..")
      .getByText("No", { exact: true }),
  ).toBeVisible();
  await expect(
    controlledEffect
      .getByText("Midas source flag", { exact: true })
      .locator("..")
      .getByText("Yes", { exact: true }),
  ).toBeVisible();
  await expect(
    controlledEffect.getByText("Buff tag source token", { exact: true }),
  ).toBeVisible();
  await expect(
    controlledEffect.getByText("synthetic-bankster", { exact: true }),
  ).toBeVisible();
  await expect(controlledEffect.getByRole("link")).toHaveCount(0);
  await expect(
    effects.getByText(/without combining them into.*buff-tag matching/i),
  ).toBeVisible();
  await expect(
    effects.getByRole("listitem").filter({ hasText: "Starts bleeding effect" }),
  ).toBeVisible();
  const teleportEffect = effects
    .getByRole("listitem")
    .filter({ hasText: "Teleport effect" })
    .first();
  await expect(
    teleportEffect
      .getByText("Skip animation", { exact: true })
      .locator("..")
      .getByText("No", { exact: true }),
  ).toBeVisible();
  await expect(
    teleportEffect
      .getByText("Effect sprite reference", { exact: true })
      .locator("..")
      .getByText("Supplied", { exact: true }),
  ).toBeVisible();
  await expect(
    teleportEffect
      .getByText("Effect frame count", { exact: true })
      .locator("..")
      .getByText("5", { exact: true }),
  ).toBeVisible();
  await expect(
    teleportEffect
      .getByText("Effect source frame rate", { exact: true })
      .locator("..")
      .getByText("90", { exact: true }),
  ).toBeVisible();
  await expect(
    teleportEffect
      .getByText("Centered effect presentation", { exact: true })
      .locator("..")
      .getByText("No", { exact: true }),
  ).toBeVisible();
  await expect(
    teleportEffect
      .getByText("Effect sound cue", { exact: true })
      .locator("..")
      .getByText("Supplied", { exact: true }),
  ).toBeVisible();
  const createEffect = effects
    .getByRole("listitem")
    .filter({ hasText: "Create effect" })
    .first();
  await expect(
    createEffect
      .getByText("Created object sprite reference", { exact: true })
      .locator("..")
      .getByText("Supplied", { exact: true }),
  ).toBeVisible();
  const digEffect = effects
    .getByRole("listitem")
    .filter({ hasText: "Dig effect" })
    .first();
  await expect(
    digEffect
      .getByText("Regenerate graphics source flag", { exact: true })
      .locator("..")
      .getByText("No", { exact: true }),
  ).toBeVisible();
  await expect(effects).not.toContainText("assets/synthetic.svg");
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
  const removalBacklinks = backlinks.getByRole("region", {
    name: "Named buff removals",
  });
  await expect(
    removalBacklinks.getByRole("link", { name: "Clockwork Echo" }),
  ).toBeVisible();
  await expect(
    removalBacklinks.getByText("Remove buff by name effect"),
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
  const boozeRequirement = page.getByRole("region", {
    name: "Booze requirement",
  });
  await expect(
    boozeRequirement.getByText("Booze source value", { exact: true }),
  ).toBeVisible();
  await expect(boozeRequirement.getByText("10", { exact: true })).toBeVisible();
  await expect(
    boozeRequirement.getByText(/without inferring an actor, inventory/i),
  ).toBeVisible();
  const zorkmidRequirement = page.getByRole("region", {
    name: "Zorkmid requirement",
  });
  await expect(
    zorkmidRequirement.getByText("Zorkmids source value", { exact: true }),
  ).toBeVisible();
  await expect(
    zorkmidRequirement.getByText("25", { exact: true }),
  ).toBeVisible();
  await expect(
    zorkmidRequirement.getByText("zorkmidScaleF source value", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    zorkmidRequirement.getByText("2.5", { exact: true }),
  ).toBeVisible();
  await expect(
    zorkmidRequirement.getByText("savvyBonus source value", { exact: true }),
  ).toBeVisible();
  await expect(
    zorkmidRequirement.getByText("0.25", { exact: true }),
  ).toBeVisible();
  await expect(
    zorkmidRequirement.getByText(/do not establish a cost or savvy formula/i),
  ).toBeVisible();
  await expect(zorkmidRequirement.getByRole("link")).toHaveCount(0);
  const shieldRequirement = page.getByRole("region", {
    name: "Shield requirement",
  });
  await expect(
    shieldRequirement.getByText("Shield source flag", { exact: true }),
  ).toBeVisible();
  await expect(
    shieldRequirement.getByText("Yes", { exact: true }),
  ).toBeVisible();
  await expect(
    shieldRequirement.getByText(/without inferring an actor, equipment state/i),
  ).toBeVisible();
  const weaponRequirement = page.getByRole("region", {
    name: "Weapon requirement",
  });
  await expect(
    weaponRequirement.getByText("Weapon source flag", { exact: true }),
  ).toBeVisible();
  await expect(
    weaponRequirement.getByText("No", { exact: true }),
  ).toBeVisible();
  await expect(
    weaponRequirement.getByText(
      /without inferring an actor, equipped item state/i,
    ),
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
  const removedBuffEffect = echoEffects
    .getByRole("listitem")
    .filter({ hasText: "Remove buff by name effect" });
  const removedBuffLink = removedBuffEffect.getByRole("link", {
    name: "Clockwork Spark",
  });
  await expect(removedBuffLink).toBeVisible();
  await expect(
    removedBuffEffect.getByText("Resolved named buff target", { exact: true }),
  ).toBeVisible();
  await removedBuffLink.focus();
  await expect(removedBuffLink).toBeFocused();
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
  await expect(page.getByText(/unsupported spell requirement/i)).toHaveCount(0);
  await expect(
    echoEffects.getByText(
      /removal eligibility, removal scope, stack handling/i,
    ),
  ).toBeVisible();
});
