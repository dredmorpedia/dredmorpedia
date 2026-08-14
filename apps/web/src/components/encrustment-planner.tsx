"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import {
  createEncrustmentPlan,
  craftingOutputOptions,
  type CraftingOutputOption,
  type CraftingPlanItem,
  type CraftingPlanRecipe,
  type EncrustmentPlanDefinition,
} from "@dredmorpedia/domain";

import { CraftingPlanResults } from "@/components/crafting-plan-results";
import { updateCraftingChoiceParams } from "@/lib/crafting-plan-url";
import { titleCase } from "@/lib/display-labels";

export interface EncrustmentPlannerEntry extends EncrustmentPlanDefinition {
  tool: string;
  hidden: boolean;
  skillLevel: number;
  slots: string[];
  instability: number;
}

interface ParsedChoice {
  itemId: string;
  key: string;
  token: string;
}

const maximumApplications = 999;

function optionToken(
  item: CraftingPlanItem,
  option: CraftingOutputOption,
): string {
  return `${item.slug}~${option.recipe.slug}~${option.outputIndex}`;
}

export function EncrustmentPlanner({
  items,
  recipes,
  encrustments,
}: {
  items: CraftingPlanItem[];
  recipes: CraftingPlanRecipe[];
  encrustments: EncrustmentPlannerEntry[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const serializedSearchParams = searchParams.toString();
  const latestSearchParams = useRef(serializedSearchParams);
  useEffect(() => {
    latestSearchParams.current = serializedSearchParams;
  }, [serializedSearchParams]);

  const encrustmentsBySlug = useMemo(
    () => new Map(encrustments.map((entry) => [entry.slug, entry])),
    [encrustments],
  );
  const optionsByToken = useMemo(() => {
    const result = new Map<string, ParsedChoice>();
    for (const item of items) {
      for (const option of craftingOutputOptions(recipes, item.id)) {
        const token = optionToken(item, option);
        result.set(token, { itemId: item.id, key: option.key, token });
      }
    }
    return result;
  }, [items, recipes]);

  const targetSlug = searchParams.get("encrustment") ?? "";
  const target = encrustmentsBySlug.get(targetSlug);
  const quantitySource = searchParams.get("quantity");
  const parsedApplications = Number(quantitySource ?? "1");
  const applications =
    Number.isInteger(parsedApplications) &&
    parsedApplications >= 1 &&
    parsedApplications <= maximumApplications
      ? parsedApplications
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
    ? createEncrustmentPlan(items, recipes, target, applications, selections)
    : null;
  const staleTarget = targetSlug.length > 0 && target === undefined;
  const invalidQuantity =
    quantitySource !== null &&
    (!Number.isInteger(parsedApplications) ||
      parsedApplications < 1 ||
      parsedApplications > maximumApplications);
  const activeChoiceItemIds = new Set(
    plan?.selectedChoices.map((choice) => choice.item.id) ?? [],
  );
  const canonicalChoiceTokens = [...choicesByItemId.values()]
    .filter((choice) => activeChoiceItemIds.has(choice.itemId))
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
      params.set("encrustment", slug);
    } else {
      params.delete("encrustment");
    }
    params.delete("choice");
    replaceUrl(params);
  };

  const selectApplications = (value: string) => {
    const params = new URLSearchParams(latestSearchParams.current);
    const nextApplications = Number(value);
    if (
      Number.isInteger(nextApplications) &&
      nextApplications >= 1 &&
      nextApplications <= maximumApplications
    ) {
      if (nextApplications === 1) {
        params.delete("quantity");
      } else {
        params.set("quantity", String(nextApplications));
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
    replaceUrl(
      updateCraftingChoiceParams(
        latestSearchParams.current,
        optionsByToken,
        itemId,
        nextChoice,
      ),
    );
  };

  return (
    <div className="crafting-tool-stack">
      <section
        className="detail-card"
        aria-labelledby="encrustment-controls-heading"
      >
        <div className="crafting-card-heading">
          <div>
            <p className="eyebrow">Plan setup</p>
            <h2 id="encrustment-controls-heading" className="section-title-sm">
              Choose an encrustment
            </h2>
          </div>
          <p className="result-count">
            {encrustments.length}{" "}
            {encrustments.length === 1 ? "encrustment" : "encrustments"}
          </p>
        </div>
        <div className="crafting-controls">
          <label className="filter-field">
            <span>Encrustment</span>
            <select
              className="search-input"
              value={target?.slug ?? ""}
              onChange={(event) => selectTarget(event.target.value)}
            >
              <option value="">Choose an encrustment</option>
              {encrustments.map((entry) => (
                <option key={entry.id} value={entry.slug}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Applications</span>
            <input
              key={applications}
              className="search-input"
              type="number"
              min="1"
              max={maximumApplications}
              step="1"
              defaultValue={applications}
              onChange={(event) => selectApplications(event.target.value)}
              onBlur={(event) => {
                const nextApplications = Number(event.currentTarget.value);
                if (
                  !Number.isInteger(nextApplications) ||
                  nextApplications < 1 ||
                  nextApplications > maximumApplications
                ) {
                  event.currentTarget.value = String(applications);
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
          aria-labelledby="stale-encrustment-heading"
        >
          <div>
            <p className="eyebrow">Unavailable encrustment</p>
            <h2
              id="stale-encrustment-heading"
              className="text-lg font-semibold"
            >
              This encrustment is not in the active dataset.
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              The shared URL may refer to another dataset. Choose an available
              encrustment above.
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
            Select an encrustment to build its ingredient plan.
          </h2>
          <p className="mt-2 text-sm leading-6">
            The selection, application count, and explicit source-yield choices
            stay in the URL so the same plan can be reopened or shared.
          </p>
        </section>
      ) : null}

      {plan && target ? (
        <>
          <section
            className={`crafting-plan-status ${plan.complete ? "crafting-plan-status-complete" : ""}`}
            aria-labelledby="plan-status-heading"
          >
            <div>
              <p className="eyebrow">Plan status</p>
              <h2 id="plan-status-heading" className="text-lg font-semibold">
                {plan.complete
                  ? `Plan ready for ${applications} × ${target.name}`
                  : plan.cycles.length > 0
                    ? "A recipe cycle prevents calculation"
                    : plan.choices.length > 0
                      ? `${plan.choices.length} source yield ${plan.choices.length === 1 ? "choice" : "choices"} required`
                      : "The plan contains unresolved ingredients"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                This calculates ingredient preparation only. It does not infer
                equipment ownership, application behavior, or instability
                outcomes.
              </p>
            </div>
            <Link
              className="entity-link font-semibold"
              href={`/encrustments/${target.slug}/`}
            >
              Open {target.name} →
            </Link>
          </section>

          <section
            className="detail-card"
            aria-labelledby="application-declaration-heading"
          >
            <div className="crafting-card-heading">
              <div>
                <p className="eyebrow">Source declaration</p>
                <h2
                  id="application-declaration-heading"
                  className="section-title-sm"
                >
                  Application ingredients
                </h2>
              </div>
              <span className="category-chip">
                {titleCase(target.tool)} · source skill {target.skillLevel}
              </span>
            </div>
            <p className="detail-section-note">
              Applies to{" "}
              {target.slots.map(titleCase).join(", ") || "no normalized slots"};
              source instability {target.instability > 0 ? "+" : ""}
              {target.instability}.
            </p>
            {plan.ingredientRequirements.length > 0 ? (
              <ul className="crafting-requirement-list">
                {plan.ingredientRequirements.map((requirement) => (
                  <li key={`${requirement.itemKey}:${requirement.itemName}`}>
                    <span>
                      {requirement.item ? (
                        <Link
                          className="entity-link font-semibold"
                          href={`/items/${requirement.item.slug}/`}
                        >
                          {requirement.item.name}
                        </Link>
                      ) : (
                        requirement.itemName
                      )}
                      {!requirement.item ? (
                        <small>Unresolved source item</small>
                      ) : null}
                    </span>
                    <strong>
                      {requirement.totalAmount}
                      <small>
                        {requirement.amountPerApplication} per application
                      </small>
                    </strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="detail-section-note">
                No normalized ingredients are declared.
              </p>
            )}
          </section>

          <CraftingPlanResults
            plan={plan}
            selections={selections}
            onSelectChoice={selectChoice}
          />
        </>
      ) : null}
    </div>
  );
}
