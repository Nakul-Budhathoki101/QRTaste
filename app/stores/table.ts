import { defineStore } from "pinia";

export type TableStatus = "available" | "occupied" | "reserved" | "cleaning";

export interface RestaurantTable {
  id: number;
  name: string;
  seats: number;
  status: TableStatus;
  customerCount?: number;
  startTime?: string;
  timeLimit?: number;
}

export const useTableStore = defineStore("table", {
  state: () => ({
    tables: [
      {
        id: 1,
        name: "A1",
        seats: 4,
        status: "available",
      },

      {
        id: 2,
        name: "A2",
        seats: 4,
        status: "available",
      },

      {
        id: 3,
        name: "B1",
        seats: 4,
        status: "available",
      },

      {
        id: 4,
        name: "B2",
        seats: 4,
        status: "available",
      },
      {
        id: 5,
        name: "XXX",
        seats: 4,
        status: "available",
      },
    ] as RestaurantTable[],
  }),

  actions: {
    startSession(
      tableId: number,
      payload: {
        customerCount: number;
        timeLimit?: number;
      },
    ) {
      const table = this.tables.find((t) => t.id === tableId);

      if (!table) return;

      table.status = "occupied";
      table.customerCount = payload.customerCount;
      table.timeLimit = payload.timeLimit;
      table.startTime = new Date().toISOString();
    },
    updateSession(
      tableId: number,
      payload: {
        customerCount: number;
        timeLimit?: number;
      },
    ) {
      const table = this.tables.find((t) => t.id === tableId);

      if (!table) return;

      table.customerCount = payload.customerCount;

      table.timeLimit = payload.timeLimit;
    },
    setCleaning(tableId: number) {
      const table = this.tables.find((t) => t.id === tableId);

      if (!table) return;

      table.status = "cleaning";
    },

    resetTable(tableId: number) {
      const table = this.tables.find((t) => t.id === tableId);

      if (!table) return;

      table.status = "available";
      table.customerCount = undefined;
      table.timeLimit = undefined;
      table.startTime = undefined;
    },
  },
});
