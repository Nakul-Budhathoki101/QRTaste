import { defineStore } from "pinia";

import { useSupabase } from "~/lib/supabase";

import type {
  AppliedCoupon,
  Coupon,
  CouponDiscountType,
} from "~/types/coupon";

export const useCouponStore = defineStore("coupon", () => {
  const supabase = useSupabase();

  const coupons = ref<Coupon[]>([]);
  const appliedCoupons = ref<AppliedCoupon[]>([]);

  const normalizeCode = (code: string) => code.trim().toUpperCase();

  const loadCoupons = async () => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return { success: false, message: error.message };
    }

    coupons.value = data || [];
    return { success: true, message: "Coupons loaded successfully" };
  };

  const createCoupon = async (payload: {
    code: string;
    discount_type: CouponDiscountType;
    discount_value: number;
    start_date?: string | null;
    end_date?: string | null;
    is_active?: boolean;
  }) => {
    const code = normalizeCode(payload.code);

    const { error } = await supabase.from("coupons").insert([
      {
        ...payload,
        code,
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
        is_active: payload.is_active ?? true,
      },
    ]);

    if (error) {
      console.error(error);
      return { success: false, message: error.message };
    }

    await loadCoupons();
    return { success: true, message: "Coupon created successfully" };
  };

  const updateCoupon = async (
    couponId: number,
    payload: Partial<
      Pick<
        Coupon,
        | "code"
        | "discount_type"
        | "discount_value"
        | "start_date"
        | "end_date"
        | "is_active"
      >
    >,
  ) => {
    const { error } = await supabase
      .from("coupons")
      .update({
        ...payload,
        code: payload.code ? normalizeCode(payload.code) : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", couponId);

    if (error) {
      console.error(error);
      return { success: false, message: error.message };
    }

    await loadCoupons();
    return { success: true, message: "Coupon updated successfully" };
  };

  const deleteCoupon = async (couponId: number) => {
    const { error } = await supabase.from("coupons").delete().eq("id", couponId);

    if (error) {
      console.error(error);
      return { success: false, message: error.message };
    }

    await loadCoupons();
    return { success: true, message: "Coupon deleted successfully" };
  };

  const validateCoupon = async (codeInput: string) => {
    const code = normalizeCode(codeInput);

    if (!code) {
      return { success: false, message: "Enter a coupon code" };
    }

    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      console.error(error);
      return { success: false, message: error.message };
    }

    if (!data) return { success: false, message: "Coupon not found" };
    if (!data.is_active) return { success: false, message: "Coupon is not active" };

    const now = Date.now();
    if (data.start_date && new Date(data.start_date).getTime() > now) {
      return { success: false, message: "Coupon has not started yet" };
    }
    if (data.end_date && new Date(data.end_date).getTime() < now) {
      return { success: false, message: "Coupon has expired" };
    }

    return {
      success: true,
      message: "Coupon applied",
      coupon: data as Coupon,
    };
  };

  const calculateDiscount = (
    subtotal: number,
    coupon?: Pick<Coupon, "discount_type" | "discount_value"> | null,
  ) => {
    if (!coupon || subtotal <= 0) return 0;

    const value = Number(coupon.discount_value || 0);
    const discount =
      coupon.discount_type === "percent"
        ? Math.round(subtotal * (value / 100))
        : value;

    return Math.max(0, Math.min(subtotal, discount));
  };

  const applyCouponToTable = async (payload: {
    table_id: number | null;
    table_name: string;
    session_start_at?: string | null;
    code: string;
  }) => {
    const validation = await validateCoupon(payload.code);

    if (!validation.success || !validation.coupon) return validation;

    await supabase
      .from("table_applied_coupons")
      .update({ status: "cancelled" })
      .eq("table_name", payload.table_name)
      .eq("status", "applied");

    const { error } = await supabase.from("table_applied_coupons").insert([
      {
        table_id: payload.table_id,
        table_name: payload.table_name,
        coupon_id: validation.coupon.id,
        coupon_code: validation.coupon.code,
        discount_type: validation.coupon.discount_type,
        discount_value: validation.coupon.discount_value,
        session_start_at: payload.session_start_at || null,
        status: "applied",
      },
    ]);

    if (error) {
      console.error(error);
      return { success: false, message: error.message };
    }

    await loadAppliedCouponForTable(payload.table_name, payload.session_start_at);
    return {
      success: true,
      message: `${validation.coupon.code} applied`,
      coupon: validation.coupon,
    };
  };

  const loadAppliedCouponForTable = async (
    tableName: string,
    sessionStartAt?: string | null,
  ) => {
    let query = supabase
      .from("table_applied_coupons")
      .select("*")
      .eq("table_name", tableName)
      .eq("status", "applied")
      .order("created_at", { ascending: false })
      .limit(1);

    if (sessionStartAt) {
      query = query.eq("session_start_at", sessionStartAt);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      return { success: false, message: error.message };
    }

    appliedCoupons.value = data || [];
    return {
      success: true,
      message: "Applied coupon loaded",
      coupon: appliedCoupons.value[0] || null,
    };
  };

  const cancelAppliedCoupon = async (appliedCouponId: number) => {
    const { error } = await supabase
      .from("table_applied_coupons")
      .update({ status: "cancelled" })
      .eq("id", appliedCouponId);

    if (error) {
      console.error(error);
      return { success: false, message: error.message };
    }

    appliedCoupons.value = appliedCoupons.value.filter(
      (coupon) => coupon.id !== appliedCouponId,
    );

    return { success: true, message: "Coupon removed" };
  };

  const redeemAppliedCoupon = async (appliedCouponId: number) => {
    const { error } = await supabase
      .from("table_applied_coupons")
      .update({
        status: "redeemed",
        redeemed_at: new Date().toISOString(),
      })
      .eq("id", appliedCouponId);

    if (error) {
      console.error(error);
      return { success: false, message: error.message };
    }

    appliedCoupons.value = appliedCoupons.value.filter(
      (coupon) => coupon.id !== appliedCouponId,
    );

    return { success: true, message: "Coupon redeemed" };
  };

  const currentAppliedCoupon = computed(() => appliedCoupons.value[0] || null);

  return {
    coupons,
    appliedCoupons,
    currentAppliedCoupon,
    loadCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    calculateDiscount,
    applyCouponToTable,
    loadAppliedCouponForTable,
    cancelAppliedCoupon,
    redeemAppliedCoupon,
  };
});
