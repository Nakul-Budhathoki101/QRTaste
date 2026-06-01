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

export const useTableStore = defineStore("table", () => {
  const tables = useState<RestaurantTable[]>("tables", () => []);

  const saveTables = () => {
    localStorage.setItem("restaurant_tables", JSON.stringify(tables.value));
  };

  const loadTables = () => {
    const saved = localStorage.getItem("restaurant_tables");

    if (saved) {
      tables.value = JSON.parse(saved);
      return;
    }

    tables.value = [
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

    saveTables();
  };

  const addTable = (name: string) => {
    tables.value.push({
      id: Date.now(),
      name,
      status: "available",
      customerCount: 0,
      seats: 1,
    });

    saveTables();
  };

  const removeTable = (id: number) => {
    tables.value = tables.value.filter((table) => table.id !== id);

    saveTables();
  };

  const startSession = (
    tableId: number,
    payload: {
      customerCount: number;
      timeLimit?: number;
    },
  ) => {
    const table = tables.value.find((t) => t.id === tableId);

    if (!table) return;

    table.status = "occupied";
    table.customerCount = payload.customerCount;
    table.timeLimit = payload.timeLimit;
    table.startTime = new Date().toISOString();

    saveTables();
  };

  const updateSession = (
    tableId: number,
    payload: {
      customerCount: number;
      timeLimit?: number;
    },
  ) => {
    const table = tables.value.find((t) => t.id === tableId);

    if (!table) return;

    table.customerCount = payload.customerCount;
    table.timeLimit = payload.timeLimit;

    saveTables();
  };

  const setCleaning = (tableId: number) => {
    const table = tables.value.find((t) => t.id === tableId);

    if (!table) return;

    table.status = "cleaning";
    table.startTime = undefined;

    saveTables();
  };

  const resetTable = (tableId: number) => {
    const table = tables.value.find((t) => t.id === tableId);

    if (!table) return;

    table.status = "available";
    table.customerCount = undefined;
    table.timeLimit = undefined;
    table.startTime = undefined;

    saveTables();
  };

  return {
    tables,

    loadTables,
    saveTables,

    addTable,
    removeTable,

    startSession,
    updateSession,

    setCleaning,
    resetTable,
  };
});
