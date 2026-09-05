import { describe, expect, it } from "vitest";

import {
  createEncrustmentPlan,
  craftingOutputOptions,
  type CraftingPlanItem,
  type CraftingPlanRecipe,
  type EncrustmentPlanDefinition,
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
  skillLevel = 0,
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

const encrustment = (inputs: ItemReference[]): EncrustmentPlanDefinition => ({
  id: "encrustment:test-polish",
  canonicalKey: "test polish",
  slug: "test-polish",
  name: "Test Polish",
  inputs,
});

describe("encrustment dependency plans", () => {
  it("combines application ingredients before rounding shared recipe demand", () => {
    const left = item("Left Part");
    const right = item("Right Part");
    const ingot = item("Ingot");
    const ore = item("Ore");
    const recipes = [
      recipe("Left Recipe", [input(ingot, 1)], [output(left, 1)]),
      recipe("Right Recipe", [input(ingot, 1)], [output(right, 1)]),
      recipe("Ingot Recipe", [input(ore, 1)], [output(ingot, 3)]),
    ];

    const plan = createEncrustmentPlan(
      [left, right, ingot, ore],
      recipes,
      encrustment([input(left, 1), input(right, 1)]),
      2,
    );

    expect(plan.complete).toBe(true);
    expect(plan.ingredientRequirements).toEqual([
      {
        item: left,
        itemKey: left.canonicalKey,
        itemName: left.name,
        amountPerApplication: 1,
        totalAmount: 2,
      },
      {
        item: right,
        itemKey: right.canonicalKey,
        itemName: right.name,
        amountPerApplication: 1,
        totalAmount: 2,
      },
    ]);
    expect(plan.steps.map((step) => [step.item.name, step.craftCount])).toEqual(
      [
        ["Right Part", 2],
        ["Left Part", 2],
        ["Ingot", 2],
      ],
    );
    expect(plan.baseRequirements).toEqual([{ item: ore, amount: 2 }]);
  });

  it("multiplies and aggregates unresolved source ingredients", () => {
    const missing: ItemReference = {
      itemKey: "missing polish",
      itemName: "Missing Polish",
      amount: 1,
    };
    const plan = createEncrustmentPlan(
      [],
      [],
      encrustment([missing, { ...missing, amount: 2 }]),
      3,
    );

    expect(plan.complete).toBe(false);
    expect(plan.ingredientRequirements).toEqual([
      {
        item: null,
        itemKey: "missing polish",
        itemName: "Missing Polish",
        amountPerApplication: 3,
        totalAmount: 9,
      },
    ]);
    expect(plan.unresolvedRequirements).toEqual([
      {
        itemKey: "missing polish",
        itemName: "Missing Polish",
        amount: 9,
      },
    ]);
  });

  it("preserves exact recipe yield choices for craftable ingredients", () => {
    const ingot = item("Ingot");
    const ore = item("Ore");
    const ingotRecipe = recipe(
      "Ingot Recipe",
      [input(ore, 1)],
      [output(ingot, 1), output(ingot, 2, 1)],
    );
    const options = craftingOutputOptions([ingotRecipe], ingot.id);

    const undecided = createEncrustmentPlan(
      [ingot, ore],
      [ingotRecipe],
      encrustment([input(ingot, 3)]),
      1,
    );
    expect(undecided.choices[0]).toMatchObject({
      item: ingot,
      requiredAmount: 3,
    });

    const selected = createEncrustmentPlan(
      [ingot, ore],
      [ingotRecipe],
      encrustment([input(ingot, 3)]),
      1,
      new Map([[ingot.id, options[1]!.key]]),
    );
    expect(selected.complete).toBe(true);
    expect(selected.steps[0]).toMatchObject({
      craftCount: 2,
      producedAmount: 4,
      surplusAmount: 1,
    });
    expect(selected.selectedChoices).toEqual([
      {
        item: ingot,
        requiredAmount: 3,
        options,
        selected: options[1],
      },
    ]);
    expect(selected.baseRequirements).toEqual([{ item: ore, amount: 2 }]);
  });

  it("rejects invalid application counts", () => {
    expect(() => createEncrustmentPlan([], [], encrustment([]), 0)).toThrow(
      /positive integer/,
    );
  });

  it("retains reachable selected and pending choices across cyclic application ingredients", () => {
    const loop = item("Loop");
    const pending = item("Pending");
    const selected = item("Selected");
    const unused = item("Unused");
    const ore = item("Ore");
    const recipes = [
      recipe("Loop Recipe", [input(loop, 1)], [output(loop, 1)]),
      recipe("Loop Base", [input(ore, 1)], [output(loop, 1)]),
      recipe(
        "Pending Recipe",
        [input(ore, 1)],
        [output(pending, 1), output(pending, 2)],
      ),
      recipe(
        "Selected Recipe",
        [input(ore, 1)],
        [output(selected, 1), output(selected, 2)],
      ),
      recipe(
        "Unused Recipe",
        [input(ore, 1)],
        [output(unused, 1), output(unused, 2)],
      ),
    ];
    const items = [loop, pending, selected, unused, ore];
    const selections = new Map([
      [loop.id, `${recipes[0]!.id}#0`],
      [selected.id, `${recipes[3]!.id}#1`],
      [unused.id, `${recipes[4]!.id}#1`],
    ]);
    const definition = encrustment([
      input(loop, 2),
      input(pending, 1),
      input(selected, 1),
    ]);
    const plan = createEncrustmentPlan(
      items,
      recipes,
      definition,
      3,
      selections,
    );

    expect(plan.complete).toBe(false);
    expect(plan.cycles[0]?.items).toEqual([loop, loop]);
    expect(
      plan.ingredientRequirements.map((ingredient) => ingredient.totalAmount),
    ).toEqual([6, 3, 3]);
    expect(
      plan.choices.map((choice) => [choice.item.id, choice.requiredAmount]),
    ).toEqual([[pending.id, null]]);
    expect(
      plan.selectedChoices.map((choice) => [
        choice.item.id,
        choice.requiredAmount,
        choice.selected.key,
      ]),
    ).toEqual([
      [loop.id, null, selections.get(loop.id)],
      [selected.id, null, selections.get(selected.id)],
    ]);
    expect(plan.steps).toEqual([]);
    expect(plan.baseRequirements).toEqual([]);

    const recovered = createEncrustmentPlan(
      items,
      recipes,
      definition,
      3,
      new Map([
        ...selections,
        [loop.id, `${recipes[1]!.id}#0`],
        [pending.id, `${recipes[2]!.id}#0`],
      ]),
    );
    expect(recovered.complete).toBe(true);
    expect(recovered.cycles).toEqual([]);
    expect(recovered.baseRequirements).toEqual([{ item: ore, amount: 11 }]);
    expect(
      recovered.selectedChoices.some((choice) => choice.item.id === unused.id),
    ).toBe(false);
  });
});
