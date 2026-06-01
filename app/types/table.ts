export type TableStatus =
  | "available"
  | "occupied"
  | "warning"
  | "timesup"
  | "cleaning";

export interface RestaurantTable {
  id: number;
  name: string;
  status: TableStatus;
  customerCount: number;
  startTime?: number;
  timeLimit?: number;
}
