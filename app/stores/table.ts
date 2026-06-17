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
  sessionToken?: string;
  sessionPin?: string;
}

export const useTableStore = defineStore("table", () => {
  const supabase = useSupabase();

  const tables = useState<RestaurantTable[]>("tables", () => []);

  const normalizeTable = (table: any): RestaurantTable => ({
    id: table.id,
    name: table.name,
    seats: table.seats,
    status: table.status,
    customerCount: table.customerCount ?? table.customer_count ?? undefined,
    startTime: table.startTime ?? table.start_time ?? undefined,
    timeLimit: table.timeLimit ?? table.time_limit ?? undefined,
    sessionToken: table.session_token ?? table.sessionToken ?? undefined,
    sessionPin: table.session_pin ?? table.sessionPin ?? undefined,
  });

  const createSessionToken = () =>
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

  const createSessionPin = () =>
    String(Math.floor(1000 + Math.random() * 9000));

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

    tables.value = (data ?? []).map(normalizeTable);

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
    updatedTable: Partial<{
      name: string;
      seats: number;
      status: TableStatus;
      customerCount: number | null;
      startTime: string | null;
      timeLimit: number | null;
      session_token: string | null;
      session_pin: string | null;
    }>,
  ) => {
    const { error } = await supabase
      .from("tables")
      .update(updatedTable)
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
  const startSession = async (
    tableId: number,
    payload: {
      customerCount: number;
      timeLimit?: number;
    },
  ) => {
    const startTime = new Date().toISOString();
    const sessionToken = createSessionToken();
    const sessionPin = createSessionPin();
    const result = await updateTable(tableId, {
      status: "occupied",
      customerCount: payload.customerCount,
      timeLimit: payload.timeLimit ?? null,
      startTime,
      session_token: sessionToken,
      session_pin: sessionPin,
    });

    if (!result.success) return result;

    const table = tables.value.find((t) => t.id === tableId);

    if (table) {
      table.status = "occupied";
      table.customerCount = payload.customerCount;
      table.timeLimit = payload.timeLimit;
      table.startTime = startTime;
      table.sessionToken = sessionToken;
      table.sessionPin = sessionPin;
    }

    return result;
  };
  const updateSession = async (
    tableId: number,
    payload: {
      customerCount: number;
      timeLimit?: number;
    },
  ) => {
    const result = await updateTable(tableId, {
      customerCount: payload.customerCount,
      timeLimit: payload.timeLimit ?? null,
    });

    if (!result.success) return result;

    const table = tables.value.find((t) => t.id === tableId);

    if (table) {
      table.customerCount = payload.customerCount;
      table.timeLimit = payload.timeLimit;
    }

    return result;
  };
  const setCleaning = async (tableId: number) => {
    const result = await updateTable(tableId, {
      status: "cleaning",
      customerCount: null,
      timeLimit: null,
      startTime: null,
      session_token: null,
      session_pin: null,
    });

    if (!result.success) return result;

    const table = tables.value.find((t) => t.id === tableId);

    if (table) {
      table.status = "cleaning";
      table.customerCount = undefined;
      table.timeLimit = undefined;
      table.startTime = undefined;
      table.sessionToken = undefined;
      table.sessionPin = undefined;
    }

    return result;
  };
  const resetTable = async (tableId: number) => {
    const result = await updateTable(tableId, {
      status: "available",
      customerCount: null,
      timeLimit: null,
      startTime: null,
      session_token: null,
      session_pin: null,
    });

    if (!result.success) return result;

    const table = tables.value.find((t) => t.id === tableId);

    if (table) {
      table.status = "available";
      table.customerCount = undefined;
      table.timeLimit = undefined;
      table.startTime = undefined;
      table.sessionToken = undefined;
      table.sessionPin = undefined;
    }

    return result;
  };

  const moveSession = async (sourceTableId: number, targetTableId: number) => {
    const source = tables.value.find((table) => table.id === sourceTableId);
    const target = tables.value.find((table) => table.id === targetTableId);

    if (!source || !target) {
      return {
        success: false,
        message: "Source or target table not found",
      };
    }

    if (source.id === target.id) {
      return {
        success: false,
        message: "Choose a different table",
      };
    }

    if (target.status === "occupied") {
      return {
        success: false,
        message: "Target table is already occupied. Use merge instead.",
      };
    }

    let orderQuery = supabase
      .from("orders")
      .update({
        table_id: target.id,
        table_name: target.name,
      })
      .eq("table_name", source.name)
      .eq("is_billed", false);

    if (source.startTime) {
      orderQuery = orderQuery.gte("created_at", source.startTime);
    }

    const { error: orderError } = await orderQuery;

    if (orderError) {
      console.error(orderError);
      return {
        success: false,
        message: orderError.message,
      };
    }

    const targetResult = await updateTable(target.id, {
      status: "occupied",
      customerCount: source.customerCount ?? 1,
      timeLimit: source.timeLimit ?? null,
      startTime: source.startTime ?? new Date().toISOString(),
      session_token: source.sessionToken ?? createSessionToken(),
      session_pin: source.sessionPin ?? createSessionPin(),
    });

    if (!targetResult.success) return targetResult;

    await updateTable(source.id, {
      status: "cleaning",
      customerCount: null,
      timeLimit: null,
      startTime: null,
      session_token: null,
      session_pin: null,
    });

    await loadTables();

    return {
      success: true,
      message: `Moved ${source.name} session to ${target.name}`,
    };
  };

  const mergeSession = async (sourceTableId: number, targetTableId: number) => {
    const source = tables.value.find((table) => table.id === sourceTableId);
    const target = tables.value.find((table) => table.id === targetTableId);

    if (!source || !target) {
      return {
        success: false,
        message: "Source or target table not found",
      };
    }

    if (source.id === target.id) {
      return {
        success: false,
        message: "Choose a different table",
      };
    }

    if (target.status !== "occupied") {
      return {
        success: false,
        message: "Target table must be occupied for merge",
      };
    }

    let orderQuery = supabase
      .from("orders")
      .update({
        table_id: target.id,
        table_name: target.name,
      })
      .eq("table_name", source.name)
      .eq("is_billed", false);

    if (source.startTime) {
      orderQuery = orderQuery.gte("created_at", source.startTime);
    }

    const { error: orderError } = await orderQuery;

    if (orderError) {
      console.error(orderError);
      return {
        success: false,
        message: orderError.message,
      };
    }

    const sourceStart = source.startTime ? new Date(source.startTime).getTime() : null;
    const targetStart = target.startTime ? new Date(target.startTime).getTime() : null;
    const earliestStart =
      sourceStart && targetStart
        ? new Date(Math.min(sourceStart, targetStart)).toISOString()
        : target.startTime ?? source.startTime ?? new Date().toISOString();

    const targetResult = await updateTable(target.id, {
      status: "occupied",
      customerCount: (target.customerCount ?? 0) + (source.customerCount ?? 0),
      timeLimit: target.timeLimit ?? source.timeLimit ?? null,
      startTime: earliestStart,
      session_token: target.sessionToken ?? source.sessionToken ?? createSessionToken(),
      session_pin: target.sessionPin ?? createSessionPin(),
    });

    if (!targetResult.success) return targetResult;

    await updateTable(source.id, {
      status: "cleaning",
      customerCount: null,
      timeLimit: null,
      startTime: null,
      session_token: null,
      session_pin: null,
    });

    await loadTables();

    return {
      success: true,
      message: `Merged ${source.name} into ${target.name}`,
    };
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
    moveSession,
    mergeSession,
  };
});
