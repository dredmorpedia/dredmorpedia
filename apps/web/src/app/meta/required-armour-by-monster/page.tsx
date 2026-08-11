import type { Metadata } from "next";
import Link from "next/link";

import { rankMonstersByRequiredArmour } from "@dredmorpedia/domain";

import { loadArtifact } from "@/lib/artifact";

export const metadata: Metadata = {
  title: "Required Armour by Monster",
  description:
    "See the monsters with the highest calculated Armour Absorption requirement for a non-critical mundane melee hit.",
};

function signedValue(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export default function RequiredArmourByMonsterPage() {
  const artifact = loadArtifact();
  const ranking = rankMonstersByRequiredArmour(artifact.entities.monsters);

  return (
    <article className="detail-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/browse/">Browse</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Required Armour by Monster</span>
      </nav>

      <header className="detail-header">
        <div>
          <p className="eyebrow">Meta</p>
          <h1 className="detail-title">Required Armour by Monster</h1>
          <p className="detail-copy">
            How much armour is required to completely nullify the mundane damage
            inflicted by a non-critical monster melee hit.
          </p>
        </div>
        <dl className="price-block">
          <div>
            <dt>Monsters evaluated</dt>
            <dd>{artifact.entities.monsters.length}</dd>
          </div>
          <div>
            <dt>Results shown</dt>
            <dd>{ranking.length}</dd>
          </div>
        </dl>
      </header>

      <section className="detail-card" aria-labelledby="ranking-heading">
        <h2 id="ranking-heading" className="section-title">
          Highest requirements
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The ranking combines each monster&apos;s archetype contribution with
          its effective crushing, slashing, and blasting damage modifiers.
        </p>

        {ranking.length > 0 ? (
          <ol className="required-armour-list mt-5">
            {ranking.map((entry, index) => (
              <li key={entry.monsterId} className="required-armour-card">
                <div className="required-armour-card-heading">
                  <span className="category-chip">#{index + 1}</span>
                  <h3 className="text-lg font-semibold">
                    <Link
                      className="entity-link"
                      href={`/monsters/${entry.monsterSlug}/`}
                    >
                      {entry.monsterName}
                    </Link>
                  </h3>
                </div>
                <dl className="stat-list">
                  <div>
                    <dt>Required Armour</dt>
                    <dd>{entry.requiredArmour}</dd>
                  </div>
                  <div>
                    <dt>Archetype contribution</dt>
                    <dd>{entry.archetypeContribution}</dd>
                  </div>
                  <div>
                    <dt>Mundane damage modifiers</dt>
                    <dd>{signedValue(entry.mundaneDamageModifiers)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-state mt-5" role="status">
            <h3 className="font-semibold">No monsters in this dataset</h3>
            <p>The ranking will appear when the active dataset has monsters.</p>
          </div>
        )}
      </section>
    </article>
  );
}
