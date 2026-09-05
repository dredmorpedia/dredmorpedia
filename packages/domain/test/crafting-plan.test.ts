import { describe, expect, it } from "vitest";

import {
  createCraftingPlan,
  craftingOutputOptions,
  type CraftingPlanItem,
  type CraftingPlanRecipe,
  type ItemReference,
  type RecipeOutput,
} from "../src/index";

const item = (name: string): CraftingPlanItem => ({
  id: `item:${name.toLocaleLowerCase("en")}`,
  canonicalKey: name.toLocaleLowerCase("en"),
  slug: name.toLocaleLowerCase("en").replaceAll(" ", "-"),
  name,
});

const input = (target: CraftingPlanItem, amount: number): ItemReference => ({
  itemId: target.id,
  itemKey: target.canonicalKey,
  itemName: target.name,
  amount,
});

const output = (
  target: CraftingPlanItem,
  amount: number,
  skillLevel: number,
): RecipeOutput => ({ ...input(target, amount), skillLevel });

const recipe = (
  name: string,
  inputs: CraftingPlanRecipe["inputs"],
  outputs: CraftingPlanRecipe["outputs"],
): CraftingPlanRecipe => ({
  id: `recipe:${name.toLocaleLowerCase("en")}`,
  canonicalKey: name.toLocaleLowerCase("en"),
  slug: name.toLocaleLowerCase("en").replaceAll(" ", "-"),
  name,
  tool: "smithing",
  inputs,
  outputs,
});

describe("crafting dependency plans", () => {
  it("combines shared intermediate demand before rounding recipe runs", () => {
    const target = item("Target");
    const left = item("Left Part");
    const right = item("Right Part");
    const ingot = item("Ingot");
    const ore = item("Ore");
    const recipes = [
      recipe(
        "Target Recipe",
        [input(left, 1), input(right, 1)],
        [output(target, 1, 0)],
      ),
      recipe("Left Recipe", [input(ingot, 1)], [output(left, 1, 0)]),
      recipe("Right Recipe", [input(ingot, 1)], [output(right, 1, 0)]),
      recipe("Ingot Recipe", [input(ore, 1)], [output(ingot, 2, 0)]),
    ];

    const plan = createCraftingPlan(
      [target, left, right, ingot, ore],
      recipes,
      target.id,
      1,
    );

    expect(plan.complete).toBe(true);
    expect(plan.steps.map((step) => [step.item.name, step.craftCount])).toEqual(
      [
        ["Target", 1],
        ["Right Part", 1],
        ["Left Part", 1],
        ["Ingot", 1],
      ],
    );
    expect(plan.baseRequirements).toEqual([{ item: ore, amount: 1 }]);
  });

  it("stops at source yield choices until an exact option is selected", () => {
    const target = item("Target");
    const ore = item("Ore");
    const targetRecipe = recipe(
      "Target Recipe",
      [input(ore, 1)],
      [output(target, 1, 0), output(target, 3, 2)],
    );
    const options = craftingOutputOptions([targetRecipe], target.id);

    const undecided = createCraftingPlan(
      [target, ore],
      [targetRecipe],
      target.id,
      5,
    );
    expect(undecided.complete).toBe(false);
    expect(undecided.choices[0]).toMatchObject({
      item: target,
      requiredAmount: 5,
    });
    expect(undecided.steps).toEqual([]);

    const selected = createCraftingPlan(
      [target, ore],
      [targetRecipe],
      target.id,
      5,
      new Map([[target.id, options[1]!.key]]),
    );
    expect(selected.steps[0]).toMatchObject({
      craftCount: 2,
      producedAmount: 6,
      surplusAmount: 1,
      option: { output: { amount: 3, skillLevel: 2 } },
    });
    expect(selected.selectedChoices).toEqual([
      {
        item: target,
        requiredAmount: 5,
        options,
        selected: options[1],
      },
    ]);
    expect(selected.baseRequirements).toEqual([{ item: ore, amount: 2 }]);
  });

  it("keeps independent same-name recipe declarations as source choices", () => {
    const target = item("Aqua Vitae");
    const brandy = item("Brandy");
    const nightCap = item("Night Cap");
    const fromBrandy = recipe(
      "Aqua Vitae Recipe",
      [input(brandy, 1)],
      [output(target, 1, 1)],
    );
    const fromNightCap = {
      ...recipe(
        "Aqua Vitae Recipe",
        [input(nightCap, 1)],
        [output(target, 1, 1)],
      ),
      id: "recipe:aqua vitae recipe~night-cap",
      canonicalKey: "aqua vitae recipe~night-cap",
      slug: "aqua-vitae-recipe-night-cap",
    };

    const options = craftingOutputOptions(
      [fromNightCap, fromBrandy],
      target.id,
    );
    expect(options).toHaveLength(2);
    expect(options.map((option) => option.recipe.inputs[0]?.itemName)).toEqual([
      "Brandy",
      "Night Cap",
    ]);

    const plan = createCraftingPlan(
      [target, brandy, nightCap],
      [fromNightCap, fromBrandy],
      target.id,
      1,
    );
    expect(plan.choices[0]?.options).toHaveLength(2);
  });

  it("retains and totals unresolved source ingredients", () => {
    const target = item("Target");
    const targetRecipe = recipe(
      "Target Recipe",
      [
        { itemKey: "missing", itemName: "Missing", amount: 1 },
        { itemKey: "missing", itemName: "Missing", amount: 2 },
      ],
      [output(target, 1, 0)],
    );

    const plan = createCraftingPlan([target], [targetRecipe], target.id, 2);

    expect(plan.complete).toBe(false);
    expect(plan.unresolvedRequirements).toEqual([
      { itemKey: "missing", itemName: "Missing", amount: 6 },
    ]);
  });

  it("detects selected recipe cycles without returning a shopping list", () => {
    const first = item("First");
    const second = item("Second");
    const recipes = [
      recipe("First Recipe", [input(second, 1)], [output(first, 1, 0)]),
      recipe("Second Recipe", [input(first, 1)], [output(second, 1, 0)]),
    ];

    const plan = createCraftingPlan([first, second], recipes, first.id, 1);

    expect(plan.complete).toBe(false);
    expect(
      plan.cycles.map((cycle) => cycle.items.map((entry) => entry.name)),
    ).toEqual([["First", "Second", "First"]]);
    expect(plan.steps).toEqual([]);
    expect(plan.baseRequirements).toEqual([]);
  });

  it("rejects an unknown target or invalid quantity", () => {
    const target = item("Target");
    expect(() => createCraftingPlan([target], [], "item:missing", 1)).toThrow(
      /not in the item set/,
    );
    expect(() => createCraftingPlan([target], [], target.id, 0)).toThrow(
      /positive integer/,
    );
  });

  it("retains nested selected cycle choices without calculated amounts and can recover", () => {
    const first = item("First");
    const second = item("Second");
    const ore = item("Ore");
    const recipes = [
      recipe("First Loop", [input(second, 1)], [output(first, 1, 0)]),
      recipe("First Base", [input(ore, 3)], [output(first, 1, 0)]),
      recipe("Second Loop", [input(first, 1)], [output(second, 1, 0)]),
      recipe("Second Base", [input(ore, 2)], [output(second, 1, 0)]),
    ];
    const selections = new Map([
      [first.id, `${recipes[0]!.id}#0`],
      [second.id, `${recipes[2]!.id}#0`],
    ]);
    const plan = createCraftingPlan(
      [first, second, ore],
      recipes,
      first.id,
      3,
      selections,
    );

    expect(plan.complete).toBe(false);
    expect(plan.cycles[0]?.items).toEqual([first, second, first]);
    expect(
      plan.selectedChoices.map((choice) => ({
        id: choice.item.id,
        amount: choice.requiredAmount,
        key: choice.selected.key,
      })),
    ).toEqual([
      { id: first.id, amount: null, key: selections.get(first.id) },
      { id: second.id, amount: null, key: selections.get(second.id) },
    ]);
    expect(plan.steps).toEqual([]);
    expect(plan.baseRequirements).toEqual([]);
    expect(plan.unresolvedRequirements).toEqual([]);
    expect(
      createCraftingPlan(
        [ore, second, first],
        [...recipes].reverse(),
        first.id,
        3,
        selections,
      ),
    ).toEqual(plan);

    const recovered = createCraftingPlan(
      [first, second, ore],
      recipes,
      first.id,
      3,
      new Map([...selections, [second.id, `${recipes[3]!.id}#0`]]),
    );
    expect(recovered.complete).toBe(true);
    expect(recovered.cycles).toEqual([]);
    expect(
      recovered.selectedChoices.map((choice) => choice.requiredAmount),
    ).toEqual([3, 3]);
    expect(recovered.baseRequirements).toEqual([{ item: ore, amount: 6 }]);
  });
});
