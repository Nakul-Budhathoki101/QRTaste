import type { MenuItem } from "./menu";

export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "delivered"
  | "completed";
export type OrderType = "dine_in" | "takeout";

export interface OrderItem {
  menuItemId: number;
  quantity: number;
  price: number;
  name: string;
  customization_note?: string;
  customizations?: string[];
}
export interface Order {
  id: number;

  table_id: number;
  table_name: string;

  items: OrderItem | OrderItem[];

  total_price: number;
  status: OrderStatus;
  is_billed?: boolean;
  customer_note?: string | null;
  order_type?: OrderType;
  priority?: "normal" | "high" | "rush";

  created_at: string;
}
