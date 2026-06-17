export type CouponDiscountType = "percent" | "fixed";
export type AppliedCouponStatus = "applied" | "redeemed" | "cancelled";

export interface Coupon {
  id: number;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AppliedCoupon {
  id: number;
  table_id: number | null;
  table_name: string;
  coupon_id: number | null;
  coupon_code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  status: AppliedCouponStatus;
  session_start_at?: string | null;
  created_at: string;
  redeemed_at?: string | null;
}
