import type { EncrustmentSlotPresentation } from "@/lib/encrustment-slot-icons";

export function EncrustmentSlotIconStack({
  slots,
}: {
  slots: readonly EncrustmentSlotPresentation[];
}) {
  const picturedSlots = slots.filter(
    (slot): slot is EncrustmentSlotPresentation & { iconUrl: string } =>
      slot.iconUrl !== null,
  );
  if (picturedSlots.length === 0) {
    return null;
  }
  return (
    <span
      aria-hidden="true"
      className="encrustment-slot-icon-stack"
      title={slots.map((slot) => slot.label).join(", ")}
    >
      {picturedSlots.map((slot) => (
        // The adjacent Encrust name and preview provide the accessible labels.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          height={32}
          key={slot.key}
          src={slot.iconUrl}
          title={slot.label}
          width={32}
        />
      ))}
    </span>
  );
}

export function EncrustmentSlotList({
  slots,
  variant = "detail",
}: {
  slots: readonly EncrustmentSlotPresentation[];
  variant?: "compact" | "detail";
}) {
  return (
    <ul className="encrustment-slot-list" data-variant={variant}>
      {slots.map((slot) => (
        <li className="category-chip encrustment-slot-chip" key={slot.key}>
          {slot.iconUrl ? (
            // The visible slot label remains the accessible source of truth.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              height={64}
              src={slot.iconUrl}
              title={slot.label}
              width={64}
            />
          ) : null}
          <span>{slot.label}</span>
        </li>
      ))}
    </ul>
  );
}
