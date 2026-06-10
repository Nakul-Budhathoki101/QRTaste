import { defineStore } from "pinia";
import { useSupabase } from "~/lib/supabase";
import type { ReservationStatus, TableReservation } from "~/types";

export const useReservationStore = defineStore("reservation", () => {
  const supabase = useSupabase();

  const reservations = ref<TableReservation[]>([]);

  const loadReservations = async () => {
    const { data, error } = await supabase
      .from("table_reservations")
      .select("*")
      .order("reserved_at", { ascending: true });

    if (error) {
      console.error(error);

      return {
        success: false,
        message: error.message,
      };
    }

    reservations.value = data || [];

    return {
      success: true,
      message: "Reservations loaded successfully",
    };
  };

  const createReservation = async (
    reservation: Omit<TableReservation, "id" | "created_at" | "updated_at">,
  ) => {
    const { error } = await supabase.from("table_reservations").insert([
      reservation,
    ]);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: error.message,
      };
    }

    await loadReservations();

    return {
      success: true,
      message: "Reservation created successfully",
    };
  };

  const updateReservation = async (
    reservationId: number,
    reservation: Partial<
      Pick<
        TableReservation,
        | "table_id"
        | "table_name"
        | "customer_name"
        | "customer_phone"
        | "guest_count"
        | "reserved_at"
        | "status"
        | "notes"
      >
    >,
  ) => {
    const { error } = await supabase
      .from("table_reservations")
      .update({
        ...reservation,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservationId);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: error.message,
      };
    }

    await loadReservations();

    return {
      success: true,
      message: "Reservation updated successfully",
    };
  };

  const updateReservationStatus = async (
    reservationId: number,
    status: ReservationStatus,
  ) => {
    const { error } = await supabase
      .from("table_reservations")
      .update({ status })
      .eq("id", reservationId);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: error.message,
      };
    }

    await loadReservations();

    return {
      success: true,
      message: "Reservation updated successfully",
    };
  };

  const isSameLocalDay = (value: string, date = new Date()) => {
    const target = new Date(value);

    return (
      target.getFullYear() === date.getFullYear() &&
      target.getMonth() === date.getMonth() &&
      target.getDate() === date.getDate()
    );
  };

  const getReservationsForTableToday = (tableId: number) =>
    reservations.value.filter(
      (reservation) =>
        reservation.table_id === tableId &&
        reservation.status === "reserved" &&
        isSameLocalDay(reservation.reserved_at),
    );

  const getNextReservationForTableToday = (tableId: number) => {
    const now = Date.now();

    return (
      getReservationsForTableToday(tableId)
        .filter((reservation) => new Date(reservation.reserved_at).getTime() > now)
        .sort(
          (a, b) =>
            new Date(a.reserved_at).getTime() -
            new Date(b.reserved_at).getTime(),
        )[0] || null
    );
  };

  const hasReservationConflict = (
    tableId: number,
    reservedAt: string,
    ignoreReservationId?: number,
  ) => {
    const targetTime = new Date(reservedAt).getTime();

    return reservations.value.some((reservation) => {
      if (reservation.id === ignoreReservationId) return false;
      if (reservation.table_id !== tableId) return false;
      if (reservation.status !== "reserved") return false;

      const reservationTime = new Date(reservation.reserved_at).getTime();

      return Math.abs(reservationTime - targetTime) < 60 * 1000;
    });
  };

  return {
    reservations,
    loadReservations,
    createReservation,
    updateReservation,
    updateReservationStatus,
    hasReservationConflict,
    getReservationsForTableToday,
    getNextReservationForTableToday,
  };
});
