import { defineStore } from "pinia";
import { useSupabase } from "~/lib/supabase";

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
  const supabase = useSupabase();

  const tables = useState<RestaurantTable[]>("tables", () => []);

  // backend functions..
  const loadTables = async () => {
    const { data, error } = await supabase
      .from("tables")
      .select("*")
      .order("id");

    if (error) {
      console.error(error);
      return false;
    }

    tables.value = data ?? [];

    return true;
  };
  const addTable = async (newTable: {
    name: string;
    seats: number;
    status: TableStatus;
  }) => {
    const { error } = await supabase.from("tables").insert([
      {
        name: newTable.name,
        seats: newTable.seats,
        status: newTable.status,
      },
    ]);

    if (error) {
      console.error(error);
      return {
        success: false,
        message: "Failed to add table",
      };
    }

    await loadTables();

    return {
      success: true,
      message: "Table added successfully",
    };
  };
  
  const updateTable = async (
    tableId: number,
    updatedTable: {
      name: string;
      seats: number;
      status: TableStatus;
    },
  ) => {
    const { error } = await supabase
      .from("tables")
      .update({
        name: updatedTable.name,
        seats: updatedTable.seats,
        status: updatedTable.status,
      })
      .eq("id", tableId);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: "Failed to update table",
      };
    }

    await loadTables();

    return {
      success: true,
      message: "Table updated successfully",
    };
  };
  const removeTable = async (tableId: number) => {
    const { error } = await supabase.from("tables").delete().eq("id", tableId);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: "Failed to delete table",
      };
    }

    await loadTables();

    return {
      success: true,
      message: "Table deleted successfully",
    };
  };

  // sessions functions..
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
  };
  const setCleaning = (tableId: number) => {
    const table = tables.value.find((t) => t.id === tableId);

    if (!table) return;

    table.status = "cleaning";
    table.startTime = undefined;
  };
  const resetTable = (tableId: number) => {
    const table = tables.value.find((t) => t.id === tableId);

    if (!table) return;

    table.status = "available";
    table.customerCount = undefined;
    table.timeLimit = undefined;
    table.startTime = undefined;
  };

  return {
    tables,

    loadTables,

    addTable,
    updateTable,
    removeTable,

    startSession,
    updateSession,

    setCleaning,
    resetTable,
  };
});
