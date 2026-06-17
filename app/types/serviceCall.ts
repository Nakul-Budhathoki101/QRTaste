export type ServiceCallType = "staff" | "water" | "bill";
export type ServiceCallStatus = "open" | "acknowledged" | "resolved";

export interface ServiceCall {
  id: number;
  table_id: number | null;
  table_name: string;
  call_type: ServiceCallType;
  status: ServiceCallStatus;
  notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
}
