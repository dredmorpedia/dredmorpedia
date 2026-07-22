const itemCategoryLabels: Readonly<Record<string, string>> = {
  "weapon:sword": "Sword weapon",
  "weapon:axe": "Axe weapon",
  "weapon:mace": "Mace weapon",
  "weapon:staff": "Staff weapon",
  "weapon:crossbow": "Crossbow",
  "weapon:thrown": "Thrown weapon",
  "weapon:ammunition": "Ammunition",
  "weapon:dagger": "Dagger weapon",
  "weapon:polearm": "Polearm weapon",
  weapon: "Weapon",
  "armour:head": "Head armour",
  "armour:chest": "Chest armour",
  "armour:legs": "Leg armour",
  "armour:hands": "Hand armour",
  "armour:feet": "Foot armour",
  "armour:waist": "Waist armour",
  "armour:shield": "Shield",
  "armour:ring": "Ring",
  "armour:neck": "Amulet",
  "armour:sleeve": "Armour sleeve",
  armour: "Armour",
  orb: "Orb",
  tome: "Tome",
  food: "Food",
  booze: "Booze",
  trap: "Trap",
  wand: "Wand",
  potion: "Potion",
  mushroom: "Mushroom",
  gem: "Gem",
  toolkit: "Toolkit",
  reagent: "Reagent",
  item: "Item",
};

function titleCase(value: string): string {
  return value
    .split(/[-_: ]+/)
    .filter(Boolean)
    .map(
      (part) => `${part.slice(0, 1).toLocaleUpperCase("en")}${part.slice(1)}`,
    )
    .join(" ");
}

export function itemCategoryLabel(category: string): string {
  return itemCategoryLabels[category] ?? (titleCase(category) || "Item");
}
