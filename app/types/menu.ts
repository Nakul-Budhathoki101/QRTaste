export interface MenuItem {
  id: number;
  name: string;

  description: string | null;
  price: number;

  image_url: string | null;

  category_id: number;
  sub_category_id: number;

  is_active: boolean;
  is_sold_out: boolean;
  allergens: string[];
  created_at: string;
}

export interface MenuDailyAvailability {
  id: number;
  menu_item_id: number;
  service_date: string;
  available_quantity: number | null;
  remaining_quantity: number | null;
  is_sold_out: boolean;
  created_at: string;
  updated_at?: string;
}

export interface MenuOptionGroup {
  id: number;
  name: string;
  selection_type: "single" | "multiple";
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MenuOptionItem {
  id: number;
  group_id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}
