"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import {
  createCraftingPlan,
  craftingOutputOptions,
  type CraftingOutputOption,
  type CraftingPlanItem,
  type CraftingPlanRecipe,
} from "@dredmorpedia/domain";

import { updateCraftingChoiceParams } from "@/lib/crafting-plan-url";

interface ParsedChoice {
  itemId: string;
  key: string;
  token: string;
}

const maximumQuantity = 999;

function optionToken(
  item: CraftingPlanItem,
  option: CraftingOutputOption,
): string {
  return `${item.slug}~${option.recipe.slug}~${option.outputIndex}`;
}

function choiceLabel(option: CraftingOutputOption): string {
  return `${option.output.amount} per craft at source skill ${option.output.skillLevel} — ${option.recipe.name}`;
}

export function CraftingPlanner({
  items,
  recipes,
}: {
  items: CraftingPlanItem[];
  recipes: CraftingPlanRecipe[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const serializedSearchParams = searchParams.toString();
  const latestSearchParams = useRef(serializedSearchParams);
  useEffect(() => {
    latestSearchParams.current = serializedSearchParams;
  }, [serializedSearchParams]);

  const itemsBySlug = useMemo(
    () => new Map(items.map((item) => [item.slug, item])),
    [items],
  );
  const craftableItems = useMemo(
    () =>
      items.filter(
        (item) => craftingOutputOptions(recipes, item.id).length > 0,
      ),
    [items, recipes],
  );
  const optionsByToken = useMemo(() => {
    const result = new Map<string, ParsedChoice>();
    for (const item of craftableItems) {
      for (const option of craftingOutputOptions(recipes, item.id)) {
        const token = optionToken(item, option);
        result.set(token, { itemId: item.id, key: option.key, token });
      }
    }
    return result;
  }, [craftableItems, recipes]);

  const targetSlug = searchParams.get("item") ?? "";
  const target = itemsBySlug.get(targetSlug);
  const quantitySource = searchParams.get("quantity");
  const parsedQuantity = Number(quantitySource ?? "1");
  const quantity =
    Number.isInteger(parsedQuantity) &&
    parsedQuantity >= 1 &&
    parsedQuantity <= maximumQuantity
      ? parsedQuantity
      : 1;
  const sourceChoiceTokens = searchParams.getAll("choice");
  const parsedChoices = sourceChoiceTokens.flatMap((token) => {
    const choice = optionsByToken.get(token);
    return choice ? [choice] : [];
  });
  const choicesByItemId = new Map<string, ParsedChoice>();
  for (const choice of parsedChoices) {
    choicesByItemId.set(choice.itemId, choice);
  }
  const selections = new Map(
    [...choicesByItemId].map(([itemId, choice]) => [itemId, choice.key]),
  );

  const plan = target
    ? createCraftingPlan(items, recipes, target.id, quantity, selections)
    : null;
  const staleTarget = targetSlug.length > 0 && target === undefined;
  const invalidQuantity =
    quantitySource !== null &&
    (!Number.isInteger(parsedQuantity) ||
      parsedQuantity < 1 ||
      parsedQuantity > maximumQuantity);
  const canonicalChoiceTokens = [...choicesByItemId.values()]
    .map((choice) => choice.token)
    .sort();
  const choicesNeedCleanup =
    [...sourceChoiceTokens].sort().join("\u001f") !==
    canonicalChoiceTokens.join("\u001f");

  const replaceUrl = (params: URLSearchParams) => {
    const next = params.toString();
    latestSearchParams.current = next;
    router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
  };

  useEffect(() => {
    if (!invalidQuantity && !choicesNeedCleanup) {
      return;
    }
    const params = new URLSearchParams(serializedSearchParams);
    if (invalidQuantity) {
      params.delete("quantity");
    }
    if (choicesNeedCleanup) {
      params.delete("choice");
      for (const token of canonicalChoiceTokens) {
        params.append("choice", token);
      }
    }
    const next = params.toString();
    latestSearchParams.current = next;
    router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
  }, [
    canonicalChoiceTokens,
    choicesNeedCleanup,
    invalidQuantity,
    pathname,
    router,
    serializedSearchParams,
  ]);

  const selectTarget = (slug: string) => {
    const params = new URLSearchParams(latestSearchParams.current);
    if (slug) {
      params.set("item", slug);
    } else {
      params.delete("item");
    }
    params.delete("choice");
    replaceUrl(params);
  };

  const selectQuantity = (value: string) => {
    const params = new URLSearchParams(latestSearchParams.current);
    const nextQuantity = Number(value);
    if (
      Number.isInteger(nextQuantity) &&
      nextQuantity >= 1 &&
      nextQuantity <= maximumQuantity
    ) {
      if (nextQuantity === 1) {
        params.delete("quantity");
      } else {
        params.set("quantity", String(nextQuantity));
      }
      replaceUrl(params);
    }
  };

  const selectChoice = (itemId: string, key: string) => {
    let nextChoice: ParsedChoice | null = null;
    if (key) {
      const item = items.find((entry) => entry.id === itemId);
      const option = craftingOutputOptions(recipes, itemId).find(
        (entry) => entry.key === key,
      );
      if (item && option) {
        const token = optionToken(item, option);
        nextChoice = { itemId, key, token };
      }
    }
    const params = updateCraftingChoiceParams(
      latestSearchParams.current,
      optionsByToken,
      itemId,
      nextChoice,
    );
    replaceUrl(params);
  };

  return (
    <div className="crafting-tool-stack">
      <section
        className="detail-card"
        aria-labelledby="crafting-controls-heading"
      >
        <div className="crafting-card-heading">
          <div>
            <p className="eyebrow">Plan setup</p>
            <h2 id="crafting-controls-heading" className="section-title-sm">
              Choose an output
            </h2>
          </div>
          <p className="result-count">
            {craftableItems.length} craftable items
          </p>
        </div>
        <div className="crafting-controls">
          <label className="filter-field">
            <span>Target item</span>
            <select
              className="search-input"
              value={target?.slug ?? ""}
              onChange={(event) => selectTarget(event.target.value)}
            >
              <option value="">Choose a craftable item</option>
              {craftableItems.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Quantity</span>
            <input
              key={quantity}
              className="search-input"
              type="number"
              min="1"
              max={maximumQuantity}
              step="1"
              defaultValue={quantity}
              onChange={(event) => selectQuantity(event.target.value)}
              onBlur={(event) => {
                const nextQuantity = Number(event.currentTarget.value);
                if (
                  !Number.isInteger(nextQuantity) ||
                  nextQuantity < 1 ||
                  nextQuantity > maximumQuantity
                ) {
                  event.currentTarget.value = String(quantity);
                }
              }}
              disabled={!target}
            />
          </label>
        </div>
      </section>

      {staleTarget ? (
        <section
          className="diagnostic-panel"
          aria-labelledby="stale-target-heading"
        >
          <div>
            <p className="eyebrow">Unavailable target</p>
            <h2 id="stale-target-heading" className="text-lg font-semibold">
              This item is not craftable in the active dataset.
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              The shared URL may refer to another dataset or to an item that no
              longer has a normalized recipe. Choose an available target above.
            </p>
          </div>
        </section>
      ) : null}

      {!target && !staleTarget ? (
        <section className="empty-state" aria-labelledby="empty-plan-heading">
          <h2
            id="empty-plan-heading"
            className="text-lg font-semibold text-foreground"
          >
            Select an item to build its dependency plan.
          </h2>
          <p className="mt-2 text-sm leading-6">
            The target, quantity, and explicit source-yield choices stay in the
            URL so the same plan can be reopened or shared.
          </p>
        </section>
      ) : null}

      {plan ? (
        <>
          <section
            className={`crafting-plan-status ${plan.complete ? "crafting-plan-status-complete" : ""}`}
            aria-labelledby="plan-status-heading"
          >
            <div>
              <p className="eyebrow">Plan status</p>
              <h2 id="plan-status-heading" className="text-lg font-semibold">
                {plan.complete
                  ? `Ready to craft ${quantity} × ${plan.target.name}`
                  : plan.cycles.length > 0
                    ? "A recipe cycle prevents calculation"
                    : plan.choices.length > 0
                      ? `${plan.choices.length} source yield ${plan.choices.length === 1 ? "choice" : "choices"} required`
                      : "The plan contains unresolved ingredients"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Quantities combine shared ingredient demand before rounding
                recipe runs. Inventory, found loot, and surplus reuse are not
                assumed.
              </p>
            </div>
            <Link
              className="entity-link font-semibold"
              href={`/items/${plan.target.slug}/`}
            >
              Open {plan.target.name} →
            </Link>
          </section>

          {plan.cycles.length > 0 ? (
            <section className="detail-card" aria-labelledby="cycle-heading">
              <h2 id="cycle-heading" className="section-title-sm">
                Recipe cycles
              </h2>
              <ul className="crafting-requirement-list">
                {plan.cycles.map((cycle) => (
                  <li key={cycle.items.map((item) => item.id).join(":")}>
                    {cycle.items.map((item) => item.name).join(" → ")}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {plan.choices.length > 0 ? (
            <section
              className="detail-card"
              aria-labelledby="yield-choices-heading"
            >
              <p className="eyebrow">Source declarations</p>
              <h2 id="yield-choices-heading" className="section-title-sm">
                Choose yield tiers
              </h2>
              <p className="detail-section-note">
                The XML lists alternative outputs by source skill. Select the
                declaration you want to calculate; this tool does not infer
                character eligibility or the game engine&apos;s selection rules.
              </p>
              <div className="crafting-choice-list">
                {plan.choices.map((choice) => (
                  <label key={choice.item.id} className="filter-field">
                    <span>
                      {choice.item.name} ({choice.requiredAmount} needed)
                    </span>
                    <select
                      className="search-input"
                      value={selections.get(choice.item.id) ?? ""}
                      onChange={(event) =>
                        selectChoice(choice.item.id, event.target.value)
                      }
                    >
                      <option value="">Choose a source yield</option>
                      {choice.options.map((option) => (
                        <option key={option.key} value={option.key}>
                          {choiceLabel(option)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          <div className="crafting-plan-grid">
            <section className="detail-card" aria-labelledby="steps-heading">
              <p className="eyebrow">Dependency view</p>
              <h2 id="steps-heading" className="section-title-sm">
                Crafting steps
              </h2>
              {plan.steps.length > 0 ? (
                <ol className="crafting-step-list">
                  {plan.steps.map((step) => (
                    <li key={step.item.id} className="crafting-step">
                      <div className="crafting-step-heading">
                        <h3 className="relationship-title">
                          <Link
                            className="entity-link"
                            href={`/items/${step.item.slug}/`}
                          >
                            {step.item.name}
                          </Link>
                        </h3>
                        <span className="category-chip">
                          {step.craftCount}{" "}
                          {step.craftCount === 1 ? "run" : "runs"}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        <Link
                          className="entity-link font-semibold"
                          href={`/recipes/${step.option.recipe.slug}/`}
                        >
                          {step.option.recipe.name}
                        </Link>{" "}
                        · source skill {step.option.output.skillLevel} ·
                        produces {step.producedAmount}
                        {step.surplusAmount > 0
                          ? ` (${step.surplusAmount} surplus)`
                          : ""}
                      </p>
                      <ul className="crafting-input-list">
                        {step.inputs.map((input) => (
                          <li key={`${input.itemKey}:${input.itemName}`}>
                            <span>
                              {input.item ? (
                                <Link
                                  className="entity-link"
                                  href={`/items/${input.item.slug}/`}
                                >
                                  {input.item.name}
                                </Link>
                              ) : (
                                input.itemName
                              )}
                              {!input.item ? (
                                <small>Unresolved source item</small>
                              ) : null}
                            </span>
                            <strong>
                              {input.totalAmount} total
                              <small>{input.amountPerCraft} per run</small>
                            </strong>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="detail-section-note">
                  {plan.choices.length > 0
                    ? "Choose the requested source yield to expand this dependency."
                    : "No calculable crafting steps are available."}
                </p>
              )}
            </section>

            <section
              className="detail-card"
              aria-labelledby="shopping-list-heading"
            >
              <p className="eyebrow">Shopping list</p>
              <h2 id="shopping-list-heading" className="section-title-sm">
                Base requirements
              </h2>
              {plan.baseRequirements.length > 0 ||
              plan.unresolvedRequirements.length > 0 ? (
                <ul className="crafting-requirement-list">
                  {plan.baseRequirements.map((requirement) => (
                    <li key={requirement.item.id}>
                      <Link
                        className="entity-link font-semibold"
                        href={`/items/${requirement.item.slug}/`}
                      >
                        {requirement.item.name}
                      </Link>
                      <strong>{requirement.amount}</strong>
                    </li>
                  ))}
                  {plan.unresolvedRequirements.map((requirement) => (
                    <li key={`${requirement.itemKey}:${requirement.itemName}`}>
                      <span>
                        {requirement.itemName}
                        <small>Unresolved source item</small>
                      </span>
                      <strong>{requirement.amount}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="detail-section-note">
                  {plan.choices.length > 0
                    ? "Complete the yield choices to calculate all base requirements."
                    : "No base ingredients are required by the selected declarations."}
                </p>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
