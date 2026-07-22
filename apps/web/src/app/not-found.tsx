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
      <Link
        href="/search/"
        className="entity-link mt-5 inline-block font-semibold"
      >
        Search this dataset
      </Link>
    </section>
  );
}
