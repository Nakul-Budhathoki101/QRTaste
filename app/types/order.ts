import type { MenuItem } from "./menu";

export type OrderStatus = "pending" | "preparing" | "completed";

export interface OrderItem {
  menuItemId: number;
  quantity: number;
  price: number;
  name: string;
}
export interface Order {
  id: number;

  table_id: number;
  table_name: string;

  items: OrderItem;

  total_price: number;
  status: OrderStatus;

  created_at: string;
}
