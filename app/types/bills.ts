import type { OrderItem } from "./order";

export type BillStatus = "unpaid" | "paid" | "cancelled";
export type PaymentMethod = "online" | "barcode" | "credit_card" | "cash" | "other";

export interface BillItem {
  name: string;
  price: number;
  quantity: number;
  lineTotal?: number;
}

export interface TableBill {
  id: number;
  table_id?: number;
  table_name: string;
  items: (OrderItem | BillItem)[];
  subtotal: number;
  tax_amount: number;
  total_price: number;
  payment_method: PaymentMethod;
  is_paid: boolean;
  created_at: string;
  paid_at?: string;
  status?: BillStatus;
}
