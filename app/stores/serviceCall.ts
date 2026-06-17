import { defineStore } from "pinia";

import { useSupabase } from "~/lib/supabase";

import type {
  ServiceCall,
  ServiceCallStatus,
  ServiceCallType,
} from "~/types/serviceCall";

export const useServiceCallStore = defineStore("serviceCall", () => {
  const supabase = useSupabase();
  const serviceCalls = ref<ServiceCall[]>([]);
  const realtimeStatus = ref("closed");
  let serviceCallChannel: ReturnType<typeof supabase.channel> | null = null;

  const loadServiceCalls = async () => {
    const { data, error } = await supabase
      .from("service_calls")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);

      return {
        success: false,
        message: error.message,
      };
    }

    serviceCalls.value = data || [];

    return {
      success: true,
      message: "Service calls loaded successfully",
    };
  };

  const createServiceCall = async (payload: {
    table_id: number | null;
    table_name: string;
    call_type: ServiceCallType;
    notes?: string;
  }) => {
    const { error } = await supabase.from("service_calls").insert([
      {
        table_id: payload.table_id,
        table_name: payload.table_name,
        call_type: payload.call_type,
        notes: payload.notes?.trim() || null,
        status: "open",
      },
    ]);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: error.message,
      };
    }

    await loadServiceCalls();

    return {
      success: true,
      message: "Staff has been called",
    };
  };

  const updateServiceCallStatus = async (
    callId: number,
    status: ServiceCallStatus,
  ) => {
    const { error } = await supabase
      .from("service_calls")
      .update({
        status,
        resolved_at: status === "resolved" ? new Date().toISOString() : null,
      })
      .eq("id", callId);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: error.message,
      };
    }

    await loadServiceCalls();

    return {
      success: true,
      message: status === "resolved" ? "Service call cleared" : "Service call updated",
    };
  };

  const resolveOpenServiceCalls = async () => {
    const openCallIds = serviceCalls.value.map((call) => call.id);

    if (!openCallIds.length) {
      return {
        success: true,
        message: "No open service calls",
      };
    }

    const { error } = await supabase
      .from("service_calls")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .in("id", openCallIds);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: error.message,
      };
    }

    serviceCalls.value = [];
    await loadServiceCalls();

    return {
      success: true,
      message: "Open service calls cleared",
    };
  };

  const openCalls = computed(() =>
    serviceCalls.value.filter((call) => call.status === "open"),
  );

  const subscribeServiceCalls = () => {
    if (serviceCallChannel) return;

    serviceCallChannel = supabase
      .channel("service-calls")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_calls",
        },
        async () => {
          await loadServiceCalls();
        },
      )
      .subscribe((status) => {
        realtimeStatus.value = status;
      });
  };

  const unsubscribeServiceCalls = async () => {
    if (!serviceCallChannel) return;

    await supabase.removeChannel(serviceCallChannel);
    serviceCallChannel = null;
    realtimeStatus.value = "closed";
  };

  return {
    serviceCalls,
    openCalls,
    realtimeStatus,

    loadServiceCalls,
    createServiceCall,
    updateServiceCallStatus,
    resolveOpenServiceCalls,
    subscribeServiceCalls,
    unsubscribeServiceCalls,
  };
});
