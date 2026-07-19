import Link from "next/link";

export default function NotFound() {
  return (
    <section className="empty-state mx-auto max-w-xl">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-3xl font-bold">
        That synthetic record does not exist.
      </h1>
      <p className="mt-3">
        Return to the item explorer and choose a generated route.
      </p>
      <Link href="/" className="entity-link mt-5 inline-block font-semibold">
        Back to item explorer
      </Link>
    </section>
  );
}
