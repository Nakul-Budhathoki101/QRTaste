export const MENU_MAIN_CATEGORIES = {
  Food: { label: "FOOD", value: 1 },
  Drinks: { label: "DRINKS", value: 2 },
  Alcohol: { label: "ALCOHOL", value: 3 },
} as const;

export const MENU_CATEGORIES = {
  Food: ["Appetizer", "Main Course", "Dessert"],
  Drinks: ["Soft Drink", "Coffee", "Tea"],
  Alcohol: ["Beer", "Whisky", "Wine", "Cocktail", "Sake"],
} as const;
