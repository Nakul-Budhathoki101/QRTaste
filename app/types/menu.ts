// export interface MenuItem {
//   id: number;
//   name: string;
//   description: string | null;
//   price: number;
//   image_url: string | null;
//   category: string;
//   is_active: boolean;
//   created_at: string;
// }

export interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;

  main_category: string;
  sub_category: string;

  is_active: boolean;
  created_at: string;
}

export type MainCategory = "Food" | "Drinks" | "Alcohol";
