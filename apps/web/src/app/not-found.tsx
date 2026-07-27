import Link from "next/link";

export default function NotFound() {
  return (
    <section className="empty-state mx-auto max-w-xl">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-3xl font-bold">
        That record is not in this dataset.
      </h1>
      <p className="mt-3">
        It may belong to a different data source. Choose a generated route for
        the active dataset instead.
      </p>
      <div className="mt-5 flex flex-wrap gap-4 font-semibold">
        <Link href="/browse/" className="entity-link">
          Browse this dataset
        </Link>
        <Link href="/search/" className="entity-link">
          Search this dataset
        </Link>
      </div>
    </section>
  );
}
