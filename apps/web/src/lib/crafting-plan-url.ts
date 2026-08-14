export interface CraftingChoiceToken {
  itemId: string;
  token: string;
}

export function updateCraftingChoiceParams<Choice extends CraftingChoiceToken>(
  serializedParams: string,
  choicesByToken: ReadonlyMap<string, Choice>,
  itemId: string,
  choice: Choice | null,
): URLSearchParams {
  const params = new URLSearchParams(serializedParams);
  const choicesByItemId = new Map<string, Choice>();

  for (const token of params.getAll("choice")) {
    const currentChoice = choicesByToken.get(token);
    if (currentChoice) {
      choicesByItemId.set(currentChoice.itemId, currentChoice);
    }
  }

  if (choice) {
    choicesByItemId.set(itemId, choice);
  } else {
    choicesByItemId.delete(itemId);
  }

  params.delete("choice");
  for (const currentChoice of [...choicesByItemId.values()].sort(
    (left, right) =>
      left.token < right.token ? -1 : left.token > right.token ? 1 : 0,
  )) {
    params.append("choice", currentChoice.token);
  }

  return params;
}
