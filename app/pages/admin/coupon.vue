<script setup lang="ts">
import type { Coupon, CouponDiscountType } from "~/types/coupon";

const couponStore = useCouponStore();
const toastStore = useToastStore();

const search = ref("");
const showInactive = ref(true);
const editingCoupon = ref<Coupon | null>(null);

const emptyForm = () => ({
  code: "",
  discount_type: "percent" as CouponDiscountType,
  discount_value: 10,
  start_date: "",
  end_date: "",
  is_active: true,
});

const form = ref(emptyForm());

onMounted(() => {
  couponStore.loadCoupons();
});

const filteredCoupons = computed(() => {
  const term = search.value.trim().toLowerCase();

  return couponStore.coupons.filter((coupon) => {
    const matchesSearch =
      !term ||
      coupon.code.toLowerCase().includes(term) ||
      coupon.discount_type.includes(term);

    const matchesActive = showInactive.value || coupon.is_active;

    return matchesSearch && matchesActive;
  });
});

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : "No limit";

const describeDiscount = (coupon: Pick<Coupon, "discount_type" | "discount_value">) =>
  coupon.discount_type === "percent"
    ? `${coupon.discount_value}% OFF`
    : `JPY ${coupon.discount_value} OFF`;

const toDateInput = (value?: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

const validateForm = () => {
  const code = form.value.code.trim();

  if (!code) {
    toastStore.open("Coupon code is required", "error");
    return false;
  }

  if (form.value.discount_value <= 0) {
    toastStore.open("Discount must be greater than 0", "error");
    return false;
  }

  if (
    form.value.discount_type === "percent" &&
    form.value.discount_value > 100
  ) {
    toastStore.open("Percent discount cannot exceed 100", "error");
    return false;
  }

  return true;
};

const saveCoupon = async () => {
  if (!validateForm()) return;

  const payload = {
    code: form.value.code,
    discount_type: form.value.discount_type,
    discount_value: form.value.discount_value,
    start_date: form.value.start_date
      ? new Date(`${form.value.start_date}T00:00:00`).toISOString()
      : null,
    end_date: form.value.end_date
      ? new Date(`${form.value.end_date}T23:59:59`).toISOString()
      : null,
    is_active: form.value.is_active,
  };

  const result = editingCoupon.value
    ? await couponStore.updateCoupon(editingCoupon.value.id, payload)
    : await couponStore.createCoupon(payload);

  toastStore.open(result.message, result.success ? "success" : "error");

  if (!result.success) return;

  editingCoupon.value = null;
  form.value = emptyForm();
};

const editCoupon = (coupon: Coupon) => {
  editingCoupon.value = coupon;
  form.value = {
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: Number(coupon.discount_value),
    start_date: toDateInput(coupon.start_date),
    end_date: toDateInput(coupon.end_date),
    is_active: coupon.is_active,
  };
};

const toggleCoupon = async (coupon: Coupon) => {
  const result = await couponStore.updateCoupon(coupon.id, {
    is_active: !coupon.is_active,
  });

  toastStore.open(result.message, result.success ? "success" : "error");
};

const deleteCoupon = async (coupon: Coupon) => {
  const result = await couponStore.deleteCoupon(coupon.id);
  toastStore.open(result.message, result.success ? "success" : "error");
};

const resetForm = () => {
  editingCoupon.value = null;
  form.value = emptyForm();
};
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-4">
    <div class="max-w-6xl mx-auto">
      <div class="mb-5">
        <NuxtLink to="/" class="bg-gray-700 text-white px-4 py-2 rounded-lg">
          Dashboard
        </NuxtLink>
      </div>

      <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-3xl font-bold">Coupon Management</h1>
          <p class="text-gray-500 mt-1">
            Create discount codes customers can apply from the QR order screen.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        <section class="bg-white rounded-xl shadow p-5">
          <h2 class="text-xl font-bold mb-4">
            {{ editingCoupon ? "Edit Coupon" : "Add Coupon" }}
          </h2>

          <div class="space-y-3">
            <label class="block">
              <span class="block text-sm font-bold mb-1">Coupon Code</span>
              <input
                v-model="form.code"
                class="w-full border rounded-lg p-3 uppercase"
                placeholder="WELCOME10"
              />
            </label>

            <label class="block">
              <span class="block text-sm font-bold mb-1">Discount Type</span>
              <select
                v-model="form.discount_type"
                class="w-full border rounded-lg p-3 bg-white"
              >
                <option value="percent">Percent</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </label>

            <label class="block">
              <span class="block text-sm font-bold mb-1">
                Discount Value
              </span>
              <input
                v-model.number="form.discount_value"
                type="number"
                min="1"
                class="w-full border rounded-lg p-3"
              />
            </label>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="block">
                <span class="block text-sm font-bold mb-1">Start Date</span>
                <input
                  v-model="form.start_date"
                  type="date"
                  class="w-full border rounded-lg p-3"
                />
              </label>

              <label class="block">
                <span class="block text-sm font-bold mb-1">End Date</span>
                <input
                  v-model="form.end_date"
                  type="date"
                  class="w-full border rounded-lg p-3"
                />
              </label>
            </div>

            <label class="flex items-center gap-2 font-bold">
              <input v-model="form.is_active" type="checkbox" />
              Active
            </label>

            <div class="flex gap-2">
              <button
                class="flex-1 bg-gray-900 text-white rounded-lg py-3 font-bold"
                @click="saveCoupon"
              >
                {{ editingCoupon ? "Save Changes" : "Create Coupon" }}
              </button>

              <button
                v-if="editingCoupon"
                class="px-4 bg-gray-200 rounded-lg font-bold"
                @click="resetForm"
              >
                Cancel
              </button>
            </div>
          </div>
        </section>

        <section class="bg-white rounded-xl shadow overflow-hidden">
          <div class="p-4 border-b grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <input
              v-model="search"
              class="border rounded-lg p-3"
              placeholder="Search coupon code"
            />

            <label class="flex items-center gap-2 font-bold">
              <input v-model="showInactive" type="checkbox" />
              Show inactive
            </label>
          </div>

          <div
            class="hidden md:grid grid-cols-[1fr_150px_130px_170px_180px] gap-3 bg-gray-900 text-white px-4 py-3 font-bold"
          >
            <span>Code</span>
            <span>Discount</span>
            <span>Status</span>
            <span>Valid Dates</span>
            <span>Actions</span>
          </div>

          <div
            v-for="coupon in filteredCoupons"
            :key="coupon.id"
            class="grid grid-cols-1 md:grid-cols-[1fr_150px_130px_170px_180px] gap-3 px-4 py-4 border-t items-center"
          >
            <div>
              <p class="text-xl font-bold">{{ coupon.code }}</p>
              <p class="text-sm text-gray-500">
                Created {{ formatDate(coupon.created_at) }}
              </p>
            </div>

            <p class="font-bold text-green-700">
              {{ describeDiscount(coupon) }}
            </p>

            <span
              class="inline-flex w-fit rounded-full px-3 py-1 text-sm font-bold"
              :class="
                coupon.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-700'
              "
            >
              {{ coupon.is_active ? "Active" : "Inactive" }}
            </span>

            <p class="text-sm text-gray-600">
              {{ formatDate(coupon.start_date) }} -
              {{ formatDate(coupon.end_date) }}
            </p>

            <div class="flex flex-wrap gap-2">
              <button
                class="bg-blue-500 text-white px-3 py-2 rounded-lg"
                @click="editCoupon(coupon)"
              >
                Edit
              </button>

              <button
                class="bg-amber-500 text-white px-3 py-2 rounded-lg"
                @click="toggleCoupon(coupon)"
              >
                {{ coupon.is_active ? "Disable" : "Enable" }}
              </button>

              <button
                class="bg-red-500 text-white px-3 py-2 rounded-lg"
                @click="deleteCoupon(coupon)"
              >
                Delete
              </button>
            </div>
          </div>

          <div
            v-if="filteredCoupons.length === 0"
            class="p-10 text-center text-gray-500"
          >
            No coupons found.
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
