import { compareCodeUnits } from "./ordering";
import type { ItemReference, RecipeOutput } from "./types";

export interface CraftingPlanItem {
  id: string;
  canonicalKey: string;
  slug: string;
  name: string;
}

export interface CraftingPlanRecipe {
  id: string;
  canonicalKey: string;
  slug: string;
  name: string;
  tool: string;
  inputs: ItemReference[];
  outputs: RecipeOutput[];
}

export interface CraftingOutputOption {
  key: string;
  recipe: CraftingPlanRecipe;
  output: RecipeOutput;
  outputIndex: number;
}

export interface CraftingPlanInput {
  item: CraftingPlanItem | null;
  itemKey: string;
  itemName: string;
  amountPerCraft: number;
  totalAmount: number;
}

export interface CraftingPlanStep {
  item: CraftingPlanItem;
  requiredAmount: number;
  option: CraftingOutputOption;
  craftCount: number;
  producedAmount: number;
  surplusAmount: number;
  inputs: CraftingPlanInput[];
}

export interface CraftingPlanChoice {
  item: CraftingPlanItem;
  requiredAmount: number;
  options: CraftingOutputOption[];
}

export interface CraftingPlanRequirement {
  item: CraftingPlanItem;
  amount: number;
}

export interface CraftingPlanUnresolvedRequirement {
  itemKey: string;
  itemName: string;
  amount: number;
}

export interface CraftingPlanCycle {
  items: CraftingPlanItem[];
}

export interface CraftingPlan {
  target: CraftingPlanItem;
  quantity: number;
  complete: boolean;
  steps: CraftingPlanStep[];
  choices: CraftingPlanChoice[];
  baseRequirements: CraftingPlanRequirement[];
  unresolvedRequirements: CraftingPlanUnresolvedRequirement[];
  cycles: CraftingPlanCycle[];
}

type PlanNode =
  | {
      kind: "base";
      item: CraftingPlanItem;
      dependencies: string[];
    }
  | {
      kind: "choice";
      item: CraftingPlanItem;
      options: CraftingOutputOption[];
      dependencies: string[];
    }
  | {
      kind: "recipe";
      item: CraftingPlanItem;
      option: CraftingOutputOption;
      inputs: Omit<CraftingPlanInput, "totalAmount">[];
      dependencies: string[];
    };

function outputOptionKey(recipeId: string, outputIndex: number): string {
  return `${recipeId}#${outputIndex}`;
}

function compareItems(left: CraftingPlanItem, right: CraftingPlanItem): number {
  return (
    compareCodeUnits(left.canonicalKey, right.canonicalKey) ||
    compareCodeUnits(left.id, right.id)
  );
}

function compareOptions(
  left: CraftingOutputOption,
  right: CraftingOutputOption,
): number {
  return (
    compareCodeUnits(left.recipe.canonicalKey, right.recipe.canonicalKey) ||
    compareCodeUnits(left.recipe.id, right.recipe.id) ||
    left.output.skillLevel - right.output.skillLevel ||
    left.output.amount - right.output.amount ||
    left.outputIndex - right.outputIndex
  );
}

export function craftingOutputOptions(
  recipes: readonly CraftingPlanRecipe[],
  itemId: string,
): CraftingOutputOption[] {
  return recipes
    .flatMap((recipe) =>
      recipe.outputs.flatMap((output, outputIndex) =>
        output.itemId === itemId
          ? [
              {
                key: outputOptionKey(recipe.id, outputIndex),
                recipe,
                output,
                outputIndex,
              },
            ]
          : [],
      ),
    )
    .sort(compareOptions);
}

function aggregateInputs(
  inputs: readonly ItemReference[],
  itemsById: ReadonlyMap<string, CraftingPlanItem>,
): Omit<CraftingPlanInput, "totalAmount">[] {
  const aggregated = new Map<string, Omit<CraftingPlanInput, "totalAmount">>();

  for (const input of inputs) {
    const item = input.itemId ? (itemsById.get(input.itemId) ?? null) : null;
    const key = item ? `resolved:${item.id}` : `unresolved:${input.itemKey}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.amountPerCraft += input.amount;
    } else {
      aggregated.set(key, {
        item,
        itemKey: input.itemKey,
        itemName: input.itemName,
        amountPerCraft: input.amount,
      });
    }
  }

  return [...aggregated.values()].sort((left, right) => {
    if (left.item && right.item) {
      return compareItems(left.item, right.item);
    }
    if (left.item) {
      return -1;
    }
    if (right.item) {
      return 1;
    }
    return (
      compareCodeUnits(left.itemKey, right.itemKey) ||
      compareCodeUnits(left.itemName, right.itemName)
    );
  });
}

function uniqueCycles(cycles: CraftingPlanCycle[]): CraftingPlanCycle[] {
  const seen = new Set<string>();
  return cycles.filter((cycle) => {
    const itemIds = cycle.items.slice(0, -1).map((item) => item.id);
    const rotations = itemIds.map((_, index) => [
      ...itemIds.slice(index),
      ...itemIds.slice(0, index),
    ]);
    const key = rotations
      .map((rotation) => rotation.join("\u001f"))
      .sort(compareCodeUnits)[0];
    if (key === undefined || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function createCraftingPlan(
  items: readonly CraftingPlanItem[],
  recipes: readonly CraftingPlanRecipe[],
  targetItemId: string,
  quantity: number,
  selections: ReadonlyMap<string, string> = new Map(),
): CraftingPlan {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const target = itemsById.get(targetItemId);
  if (!target) {
    throw new Error(`Crafting target ${targetItemId} is not in the item set.`);
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Crafting quantity must be a positive integer.");
  }

  const optionsByItemId = new Map<string, CraftingOutputOption[]>();
  for (const recipe of recipes) {
    for (const [outputIndex, output] of recipe.outputs.entries()) {
      if (!output.itemId || !itemsById.has(output.itemId)) {
        continue;
      }
      const options = optionsByItemId.get(output.itemId) ?? [];
      options.push({
        key: outputOptionKey(recipe.id, outputIndex),
        recipe,
        output,
        outputIndex,
      });
      optionsByItemId.set(output.itemId, options);
    }
  }
  for (const options of optionsByItemId.values()) {
    options.sort(compareOptions);
  }

  const nodes = new Map<string, PlanNode>();
  const cycles: CraftingPlanCycle[] = [];
  const stack: string[] = [];

  const visit = (itemId: string): void => {
    const cycleStart = stack.indexOf(itemId);
    if (cycleStart >= 0) {
      cycles.push({
        items: [...stack.slice(cycleStart), itemId].map((cycleItemId) =>
          itemsById.get(cycleItemId)!,
        ),
      });
      return;
    }
    if (nodes.has(itemId)) {
      return;
    }

    const item = itemsById.get(itemId)!;
    const options = optionsByItemId.get(itemId) ?? [];
    const selectedKey = selections.get(itemId);
    const selected =
      options.length === 1
        ? options[0]
        : options.find((option) => option.key === selectedKey);

    if (options.length === 0) {
      nodes.set(itemId, { kind: "base", item, dependencies: [] });
      return;
    }
    if (!selected) {
      nodes.set(itemId, {
        kind: "choice",
        item,
        options,
        dependencies: [],
      });
      return;
    }

    const inputs = aggregateInputs(selected.recipe.inputs, itemsById);
    const dependencies = inputs.flatMap((input) =>
      input.item ? [input.item.id] : [],
    );
    nodes.set(itemId, {
      kind: "recipe",
      item,
      option: selected,
      inputs,
      dependencies,
    });
    stack.push(itemId);
    for (const dependency of dependencies) {
      visit(dependency);
    }
    stack.pop();
  };

  visit(target.id);
  const uniqueCycleList = uniqueCycles(cycles);
  if (uniqueCycleList.length > 0) {
    return {
      target,
      quantity,
      complete: false,
      steps: [],
      choices: [],
      baseRequirements: [],
      unresolvedRequirements: [],
      cycles: uniqueCycleList,
    };
  }

  const visited = new Set<string>();
  const postorder: string[] = [];
  const order = (itemId: string): void => {
    if (visited.has(itemId)) {
      return;
    }
    visited.add(itemId);
    const node = nodes.get(itemId);
    for (const dependency of node?.dependencies ?? []) {
      order(dependency);
    }
    postorder.push(itemId);
  };
  order(target.id);

  const demand = new Map<string, number>([[target.id, quantity]]);
  const steps: CraftingPlanStep[] = [];
  const choices: CraftingPlanChoice[] = [];
  const baseRequirements: CraftingPlanRequirement[] = [];
  const unresolved = new Map<string, CraftingPlanUnresolvedRequirement>();

  for (const itemId of postorder.reverse()) {
    const node = nodes.get(itemId)!;
    const requiredAmount = demand.get(itemId) ?? 0;
    if (node.kind === "base") {
      baseRequirements.push({ item: node.item, amount: requiredAmount });
      continue;
    }
    if (node.kind === "choice") {
      choices.push({ item: node.item, requiredAmount, options: node.options });
      continue;
    }

    const craftCount = Math.ceil(requiredAmount / node.option.output.amount);
    const producedAmount = craftCount * node.option.output.amount;
    const inputs = node.inputs.map((input) => {
      const totalAmount = input.amountPerCraft * craftCount;
      if (input.item) {
        demand.set(
          input.item.id,
          (demand.get(input.item.id) ?? 0) + totalAmount,
        );
      } else {
        const key = `${input.itemKey}\u001f${input.itemName}`;
        const existing = unresolved.get(key);
        if (existing) {
          existing.amount += totalAmount;
        } else {
          unresolved.set(key, {
            itemKey: input.itemKey,
            itemName: input.itemName,
            amount: totalAmount,
          });
        }
      }
      return { ...input, totalAmount };
    });
    steps.push({
      item: node.item,
      requiredAmount,
      option: node.option,
      craftCount,
      producedAmount,
      surplusAmount: producedAmount - requiredAmount,
      inputs,
    });
  }

  baseRequirements.sort((left, right) => compareItems(left.item, right.item));
  choices.sort((left, right) => compareItems(left.item, right.item));
  const unresolvedRequirements = [...unresolved.values()].sort(
    (left, right) =>
      compareCodeUnits(left.itemKey, right.itemKey) ||
      compareCodeUnits(left.itemName, right.itemName),
  );

  return {
    target,
    quantity,
    complete: choices.length === 0 && unresolvedRequirements.length === 0,
    steps,
    choices,
    baseRequirements,
    unresolvedRequirements,
    cycles: [],
  };
}
