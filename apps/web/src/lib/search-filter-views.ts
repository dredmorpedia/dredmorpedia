export interface SearchFilterView {
  id: string;
  label: string;
  description: string;
  href: string;
}

export const searchFilterViews: readonly SearchFilterView[] = [
  {
    id: "all-crafting",
    label: "All crafting",
    description: "Browse recipes and encrustments together.",
    href: "/search/?kind=crafting",
  },
  {
    id: "early-crafting",
    label: "Crafting through skill 2",
    description:
      "Combine recipes and encrustments whose declared source skill is 2 or lower.",
    href: "/search/?kind=crafting&maxSkill=2",
  },
];
