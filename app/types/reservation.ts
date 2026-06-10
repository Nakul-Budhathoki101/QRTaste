export type ReservationStatus = "reserved" | "seated" | "cancelled" | "completed";

export interface TableReservation {
  id: number;
  table_id: number;
  table_name: string;
  customer_name: string;
  customer_phone?: string | null;
  guest_count: number;
  reserved_at: string;
  status: ReservationStatus;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}
