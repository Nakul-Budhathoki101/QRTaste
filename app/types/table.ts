export type TableStatus =
  | "available"
  | "occupied"
  | "reserved"
  | "cleaning";

export interface RestaurantTable {
  id: number;
  name: string;
  seats: number;
  status: TableStatus;
  customerCount?: number;
  startTime?: string;
  timeLimit?: number;
  sessionToken?: string;
  sessionPin?: string;
}
