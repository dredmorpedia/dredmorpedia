import type { CraftingOutputOption } from "@dredmorpedia/domain";

function baseChoiceLabel(option: CraftingOutputOption): string {
  return `${option.output.amount} per craft at source skill ${option.output.skillLevel} — ${option.recipe.name}`;
}

function ingredientContext(option: CraftingOutputOption): string {
  const ingredients = option.recipe.inputs
    .map((input) =>
      input.amount === 1
        ? input.itemName
        : `${input.amount} × ${input.itemName}`,
    )
    .join(" + ");
  return ingredients ? `from ${ingredients}` : `using ${option.recipe.tool}`;
}

export function craftingChoiceLabel(
  option: CraftingOutputOption,
  siblingOptions: readonly CraftingOutputOption[],
): string {
  const base = baseChoiceLabel(option);
  const matching = siblingOptions.filter(
    (candidate) => baseChoiceLabel(candidate) === base,
  );
  if (matching.length < 2) {
    return base;
  }

  const context = ingredientContext(option);
  const sameContext = matching.filter(
    (candidate) => ingredientContext(candidate) === context,
  );
  if (sameContext.length < 2) {
    return `${base} · ${context}`;
  }

  const declarationIndex = sameContext.findIndex(
    (candidate) => candidate.key === option.key,
  );
  return `${base} · ${context} · declaration ${declarationIndex + 1}`;
}
