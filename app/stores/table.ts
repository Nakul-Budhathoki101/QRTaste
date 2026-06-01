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
    // tables: [
    //   {
    //     id: 1,
    //     name: "A1",
    //     seats: 4,
    //     status: "available",
    //   },

    //   {
    //     id: 2,
    //     name: "A2",
    //     seats: 4,
    //     status: "available",
    //   },

    //   {
    //     id: 3,
    //     name: "B1",
    //     seats: 4,
    //     status: "available",
    //   },

    //   {
    //     id: 4,
    //     name: "B2",
    //     seats: 4,
    //     status: "available",
    //   },
    //   {
    //     id: 5,
    //     name: "XXX",
    //     seats: 4,
    //     status: "available",
    //   },
    // ] as RestaurantTable[],
    tables: [] as RestaurantTable[],
  }),

  actions: {
    loadTables() {
      const saved = localStorage.getItem("restaurant_tables");

      if (saved) {
        this.tables = JSON.parse(saved);
        return;
      }

      this.tables = [
        {
          id: 1,
          name: "A1",
          status: "available",
          customerCount: 0,
          seats: 1,
        },
        {
          id: 2,
          name: "A2",
          status: "available",
          customerCount: 0,
          seats: 1,
        },
      ];

      this.saveTables();
    },
    addTable(name: string) {
      this.tables.push({
        id: Date.now(),
        name,
        status: "available",
        customerCount: 0,
        seats: 1,
      });

      this.saveTables();
    },
    saveTables() {
      localStorage.setItem("restaurant_tables", JSON.stringify(this.tables));
    },
    removeTable(id: number) {
      this.tables = this.tables.filter((table) => table.id !== id);

      this.saveTables();
    },
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
