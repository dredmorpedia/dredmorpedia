export function catalogueReferenceAccessibleLabel(reference: {
  amount: number;
  itemName: string;
}): string {
  return reference.amount === 1
    ? reference.itemName
    : `${reference.amount} × ${reference.itemName}`;
}
