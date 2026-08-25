import Link from "next/link";

import type { ItemTrigger, Spell } from "@dredmorpedia/domain";

import { spellTriggerLabels } from "@/lib/spell-triggers";

function sentenceContinuation(label: string): string {
  return `${label.slice(0, 1).toLowerCase()}${label.slice(1)}`;
}

export function ItemTriggerEffect({
  iconUrl,
  spell,
  trigger,
}: {
  iconUrl: string | null;
  spell: Spell | undefined;
  trigger: ItemTrigger;
}) {
  return (
    <li
      className={`item-trigger-effect${iconUrl ? " item-trigger-effect-with-icon" : ""}`}
    >
      <div className="item-trigger-primary">
        {iconUrl && spell ? (
          // The adjacent linked spell name supplies the accessible label.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="item-trigger-icon"
            height={32}
            src={iconUrl}
            title={spell.name}
            width={32}
          />
        ) : null}
        <span>
          {trigger.chance !== null ? (
            <>
              <strong>{trigger.chance}%</strong> chance of{" "}
            </>
          ) : null}
          <span className="item-trigger-spell">
            {spell ? (
              <Link className="entity-link" href={`/spells/${spell.slug}`}>
                {spell.name}
              </Link>
            ) : (
              trigger.spellName
            )}
          </span>{" "}
          {sentenceContinuation(spellTriggerLabels[trigger.kind])}
        </span>
      </div>
      {trigger.duration > 0 ? <span>For {trigger.duration} turns</span> : null}
      {trigger.delay > 0 ? <span>After {trigger.delay} turns</span> : null}
      {trigger.monsterTaxonomy ? (
        <span>Only affects {trigger.monsterTaxonomy}</span>
      ) : null}
      {trigger.unresistable ? <span>Cannot be resisted</span> : null}
    </li>
  );
}
