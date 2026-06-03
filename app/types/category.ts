export interface MenuCategory {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface MenuSubCategory {
  id: number;
  category_id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}
