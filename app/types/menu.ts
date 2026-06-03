export interface MenuItem {
  id: number;
  name: string;

  description: string | null;
  price: number;

  image_url: string | null;

  category_id: number;
  sub_category_id: number;

  is_active: boolean;
  created_at: string;
}
