"use client";

import Link from "next/link";

import {
  compareCodeUnits,
  type CraftingRequirementsPlan,
} from "@dredmorpedia/domain";

function choiceLabel(
  option: CraftingRequirementsPlan["choices"][number]["options"][number],
): string {
  return `${option.output.amount} per craft at source skill ${option.output.skillLevel} — ${option.recipe.name}`;
}

export function CraftingPlanResults({
  plan,
  selections,
  onSelectChoice,
}: {
  plan: CraftingRequirementsPlan;
  selections: ReadonlyMap<string, string>;
  onSelectChoice: (itemId: string, key: string) => void;
}) {
  const yieldChoices = [
    ...plan.choices.map((choice) => ({ choice, selectedKey: "" })),
    ...plan.selectedChoices.map((choice) => ({
      choice,
      selectedKey: choice.selected.key,
    })),
  ].sort(
    (left, right) =>
      compareCodeUnits(
        left.choice.item.canonicalKey,
        right.choice.item.canonicalKey,
      ) || compareCodeUnits(left.choice.item.id, right.choice.item.id),
  );

  return (
    <>
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

      {yieldChoices.length > 0 ? (
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
            {yieldChoices.map(({ choice, selectedKey }) => (
              <label key={choice.item.id} className="filter-field">
                <span>
                  {choice.item.name} ({choice.requiredAmount} needed)
                </span>
                <select
                  className="search-input"
                  value={selections.get(choice.item.id) ?? selectedKey}
                  onChange={(event) =>
                    onSelectChoice(choice.item.id, event.target.value)
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
                      {step.craftCount} {step.craftCount === 1 ? "run" : "runs"}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    <Link
                      className="entity-link font-semibold"
                      href={`/recipes/${step.option.recipe.slug}/`}
                    >
                      {step.option.recipe.name}
                    </Link>{" "}
                    · source skill {step.option.output.skillLevel} · produces{" "}
                    {step.producedAmount}
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
  );
}
