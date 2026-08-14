import { describe, expect, it } from "vitest";

import { updateCraftingChoiceParams } from "../src/lib/crafting-plan-url";

describe("crafting planner URL state", () => {
  it("composes rapid yield changes from the latest pending URL", () => {
    const first = { itemId: "item:first", token: "first~recipe~0" };
    const second = { itemId: "item:second", token: "second~recipe~1" };
    const choicesByToken = new Map([
      [first.token, first],
      [second.token, second],
    ]);

    const afterFirst = updateCraftingChoiceParams(
      "item=target",
      choicesByToken,
      first.itemId,
      first,
    );
    const afterSecond = updateCraftingChoiceParams(
      afterFirst.toString(),
      choicesByToken,
      second.itemId,
      second,
    );

    expect(afterSecond.getAll("choice")).toEqual([first.token, second.token]);
  });

  it("drops only the selected item choice and ignores stale tokens", () => {
    const first = { itemId: "item:first", token: "first~recipe~0" };
    const second = { itemId: "item:second", token: "second~recipe~1" };
    const choicesByToken = new Map([
      [first.token, first],
      [second.token, second],
    ]);
    const params = new URLSearchParams({ item: "target" });
    params.append("choice", first.token);
    params.append("choice", "stale~recipe~9");
    params.append("choice", second.token);

    const result = updateCraftingChoiceParams(
      params.toString(),
      choicesByToken,
      first.itemId,
      null,
    );

    expect(result.getAll("choice")).toEqual([second.token]);
  });
});
