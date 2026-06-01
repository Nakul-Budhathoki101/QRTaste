import type { OrderItem } from "./order";

export type BillStatus = "unpaid" | "paid" | "cancelled";

export interface BillItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface TableBill {
  id: number;
  tableId: number;
  tableName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: BillStatus;
  createdAt: string;
  paidAt?: string;
}
