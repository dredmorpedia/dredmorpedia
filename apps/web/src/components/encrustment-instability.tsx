export function EncrustmentInstability({
  iconUrl,
  value,
}: {
  iconUrl: string | null;
  value: string;
}) {
  return (
    <span className="encrustment-instability">
      {iconUrl ? (
        <>
          {/* The adjacent definition-list label supplies the accessible name. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            height={16}
            src={iconUrl}
            title="Instability"
            width={16}
          />
        </>
      ) : null}
      <strong>{value}</strong>
    </span>
  );
}
