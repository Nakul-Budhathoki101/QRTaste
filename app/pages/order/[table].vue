<script setup lang="ts">
import type { OrderItem } from "~/types";
import type { MenuItem } from "~/types/menu";

const route = useRoute();
const tableStore = useTableStore();
const orderStore = useOrderStore();
const menuStore = useMenuStore();
const toastStore = useToastStore();
const categoryStore = useCategoryStore();
const serviceCallStore = useServiceCallStore();
const couponStore = useCouponStore();

const activeCategoryId = ref<number>();
const showOrders = ref(false);
const showItemQuantity = ref(false);
const showCallMenu = ref(false);
const callNote = ref("");
const callConfirmation = ref("");
const selectedItem = ref<MenuItem | null>(null);
const selectedQuantity = ref(1);
const selectedOptionValues = ref<Record<number, string[]>>({});
const instructionNote = ref("");
const selectedTakeout = ref(false);
const couponCode = ref("");
const applyingCoupon = ref(false);
const sessionPinInput = ref("");
const hasSessionPinAccess = ref(false);
let tableSessionPollInterval: ReturnType<typeof setInterval>;

const tableName = String(route.params.table);

onMounted(async () => {
  await Promise.all([
    tableStore.loadTables(),
    menuStore.loadMenu(),
    menuStore.loadTodayAvailability(),
    menuStore.loadOptionGroups(),
    categoryStore.loadCategories(),
    categoryStore.loadSubCategories(),
    orderStore.loadOrders(),
    serviceCallStore.loadServiceCalls(),
  ]);

  if (tableData.value) {
    await couponStore.loadAppliedCouponForTable(
      tableData.value.name,
      tableData.value.startTime,
    );
  }

  syncSessionPinAccess();

  if (categoryStore.categories.length) {
    activeCategoryId.value = categoryStore.categories[0]?.id;
  }

  orderStore.subscribeOrders();
  serviceCallStore.subscribeServiceCalls();

  tableSessionPollInterval = setInterval(() => {
    tableStore.loadTables();
  }, 2000);
});

onUnmounted(() => {
  clearInterval(tableSessionPollInterval);
});

const tableData = computed(() =>
  tableStore.tables.find((table) => table.name === tableName),
);

const sessionAccessKey = computed(() => {
  const table = tableData.value;

  if (!table?.startTime) return "";

  return `qr-session-pin:${tableName}:${table.startTime}`;
});

const hasActiveTableSession = computed(() => {
  const table = tableData.value;

  return Boolean(
    table &&
      table.status === "occupied" &&
      table.startTime &&
      table.sessionPin,
  );
});

const hasValidSession = computed(
  () => hasActiveTableSession.value && hasSessionPinAccess.value,
);

const syncSessionPinAccess = () => {
  if (!sessionAccessKey.value) {
    hasSessionPinAccess.value = false;
    return;
  }

  hasSessionPinAccess.value =
    sessionStorage.getItem(sessionAccessKey.value) === "granted";
};

watch(hasValidSession, (isValid) => {
  if (isValid) return;

  showOrders.value = false;
  showItemQuantity.value = false;
  showCallMenu.value = false;
  selectedItem.value = null;
  couponCode.value = "";
});

watch(
  () => [tableData.value?.status, tableData.value?.startTime, tableData.value?.sessionPin],
  () => {
    syncSessionPinAccess();
  },
);

const unlockSession = () => {
  const table = tableData.value;

  if (!table?.sessionPin || !sessionAccessKey.value) {
    toastStore.open("This table session is not active", "error");
    return;
  }

  if (sessionPinInput.value.trim() !== table.sessionPin) {
    toastStore.open("Incorrect PIN", "error");
    return;
  }

  sessionStorage.setItem(sessionAccessKey.value, "granted");
  hasSessionPinAccess.value = true;
  sessionPinInput.value = "";
  toastStore.open("Order screen unlocked", "success");
};

const categories = computed(() => categoryStore.categories);

const activeSubCategories = computed(() => {
  if (!activeCategoryId.value) return [];

  return categoryStore.subCategories.filter(
    (sub) => sub.category_id === activeCategoryId.value,
  );
});

const menuItems = computed(() => menuStore.menuItems);

const isSoldOut = (item: MenuItem) =>
  !menuStore.isAvailableForOrder(item, 1);

const normalizeText = (value?: string | null) => (value || "").toLowerCase();

const getCategoryName = (item: MenuItem) =>
  normalizeText(
    categoryStore.categories.find((category) => category.id === item.category_id)
      ?.name,
  );

const getSubCategoryName = (item: MenuItem) =>
  normalizeText(
    categoryStore.subCategories.find(
      (subCategory) => subCategory.id === item.sub_category_id,
    )?.name,
  );

const hasKeyword = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.includes(keyword));

const isDrinkItem = (item: MenuItem) => {
  const text = [
    item.name,
    item.description,
    getCategoryName(item),
    getSubCategoryName(item),
  ]
    .map(normalizeText)
    .join(" ");

  return hasKeyword(text, [
    "drink",
    "beverage",
    "alcohol",
    "beer",
    "wine",
    "whiskey",
    "whisky",
    "rum",
    "cocktail",
    "highball",
    "sake",
    "shochu",
    "juice",
    "tea",
    "coffee",
    "cola",
    "soda",
  ]);
};

const isFoodItem = (item: MenuItem) => !isDrinkItem(item);

const getRemainingToday = (item: MenuItem) =>
  menuStore.getRemainingToday(item.id);

const getAvailabilityLabel = (item: MenuItem) => {
  const remaining = getRemainingToday(item);

  if (remaining === null) return "";
  if (remaining <= 0) return "Sold Out";
  return `${remaining} left today`;
};

const normalizeItems = (items: OrderItem | OrderItem[] | null | undefined) => {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
};

const myOrders = computed(() => {
  if (!hasValidSession.value) return [];

  const orders = orderStore.orders.filter((order) => {
    if (order.table_name !== tableName) return false;
    if (order.is_billed) return false;

    if (tableData.value?.startTime) {
      return (
        new Date(order.created_at).getTime() >=
        new Date(tableData.value.startTime).getTime()
      );
    }

    return true;
  });

  return orders.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
});

const orderedItems = computed(() => {
  const itemMap = new Map<
    string,
    OrderItem & { lineTotal: number; statuses: Set<string> }
  >();

  for (const order of myOrders.value) {
    for (const item of normalizeItems(order.items)) {
      const key = `${item.menuItemId}-${item.name}-${item.price}-${(item.customizations || []).join(",")}-${item.customization_note || ""}`;
      const existing = itemMap.get(key);

      if (existing) {
        existing.quantity += item.quantity;
        existing.lineTotal = existing.price * existing.quantity;
        existing.statuses.add(order.status);
      } else {
        itemMap.set(key, {
          ...item,
          lineTotal: item.price * item.quantity,
          statuses: new Set([order.status]),
        });
      }
    }
  }

  return Array.from(itemMap.values());
});

const orderSubtotal = computed(() =>
  orderedItems.value.reduce((sum, item) => sum + item.lineTotal, 0),
);

const activeCoupon = computed(() => couponStore.currentAppliedCoupon);

const couponDiscount = computed(() =>
  couponStore.calculateDiscount(orderSubtotal.value, activeCoupon.value),
);

const discountedTotal = computed(() =>
  Math.max(0, orderSubtotal.value - couponDiscount.value),
);

const latestOrderPreview = computed(() => orderedItems.value.slice(0, 2));

const groupedMenu = computed(() => {
  const grouped: Record<number, MenuItem[]> = {};

  menuItems.value.forEach((item) => {
    const subCategoryId = item.sub_category_id;

    if (!grouped[subCategoryId]) {
      grouped[subCategoryId] = [];
    }

    grouped[subCategoryId].push(item);
  });

  return grouped;
});

const selectedItemOptionGroups = computed(() =>
  selectedItem.value
    ? menuStore.getOptionGroupsForMenuItem(selectedItem.value.id)
    : [],
);

const selectedCustomizations = computed(() =>
  selectedItemOptionGroups.value.flatMap((group) =>
    (selectedOptionValues.value[group.id] || []).map(
      (option) => `${group.name}: ${option}`,
    ),
  ),
);

const callOptions = [
  {
    type: "staff" as const,
    label: "Call Staff",
    description: "Ask an employee to come to the table.",
  },
  {
    type: "water" as const,
    label: "Need Water",
    description: "Request water or basic table service.",
  },
  {
    type: "bill" as const,
    label: "Need Bill",
    description: "Ask staff to prepare checkout.",
  },
];

const toggleOption = (
  groupId: number,
  selectionType: "single" | "multiple",
  optionName: string,
) => {
  const current = selectedOptionValues.value[groupId] || [];

  if (selectionType === "single") {
    selectedOptionValues.value = {
      ...selectedOptionValues.value,
      [groupId]: current.includes(optionName) ? [] : [optionName],
    };
    return;
  }

  selectedOptionValues.value = {
    ...selectedOptionValues.value,
    [groupId]: current.includes(optionName)
      ? current.filter((item) => item !== optionName)
      : [...current, optionName],
  };
};

const isOptionSelected = (groupId: number, optionName: string) =>
  (selectedOptionValues.value[groupId] || []).includes(optionName);

const sendServiceCall = async (callType: "staff" | "water" | "bill") => {
  if (!hasValidSession.value) {
    toastStore.open("This table session is closed", "error");
    return;
  }

  if (!tableData.value) {
    toastStore.open("This table does not exist", "error");
    return;
  }

  const result = await serviceCallStore.createServiceCall({
    table_id: tableData.value.id,
    table_name: tableData.value.name,
    call_type: callType,
    notes: callNote.value,
  });

  if (!result.success) {
    toastStore.open(result.message, "error");
    return;
  }

  const selectedCall = callOptions.find((option) => option.type === callType);

  callConfirmation.value = `${selectedCall?.label || "Staff call"} sent`;
  showCallMenu.value = false;
  callNote.value = "";

  window.setTimeout(() => {
    callConfirmation.value = "";
  }, 4000);
};

const applyCoupon = async () => {
  if (!hasValidSession.value) {
    toastStore.open("This table session is closed", "error");
    return;
  }

  if (!tableData.value) {
    toastStore.open("This table does not exist", "error");
    return;
  }

  if (orderSubtotal.value <= 0) {
    toastStore.open("Add an order before applying a coupon", "error");
    return;
  }

  applyingCoupon.value = true;

  const result = await couponStore.applyCouponToTable({
    table_id: tableData.value.id,
    table_name: tableData.value.name,
    session_start_at: tableData.value.startTime,
    code: couponCode.value,
  });

  toastStore.open(result.message, result.success ? "success" : "error");

  if (result.success) couponCode.value = "";

  applyingCoupon.value = false;
};

const removeCoupon = async () => {
  if (!activeCoupon.value) return;

  const result = await couponStore.cancelAppliedCoupon(activeCoupon.value.id);
  toastStore.open(result.message, result.success ? "success" : "error");
};

const addItem = (item: MenuItem) => {
  if (!hasValidSession.value) {
    toastStore.open("This table session is closed", "error");
    return;
  }

  if (isSoldOut(item)) {
    toastStore.open("This item is sold out", "error");
    return;
  }

  selectedItem.value = item;
  selectedQuantity.value = 1;
  selectedOptionValues.value = {};
  instructionNote.value = "";
  selectedTakeout.value = false;
  showItemQuantity.value = true;
};

const addItemFinal = async () => {
  if (!selectedItem.value) return;

  if (!hasValidSession.value) {
    toastStore.open("This table session is closed", "error");
    return;
  }

  if (!tableData.value) {
    toastStore.open("This table does not exist", "error");
    return;
  }

  if (!menuStore.isAvailableForOrder(selectedItem.value, selectedQuantity.value)) {
    const remaining = getRemainingToday(selectedItem.value);

    if (remaining !== null && remaining > 0) {
      toastStore.open(`Only ${remaining} left today`, "error");
    } else {
      toastStore.open("This item is sold out today", "error");
    }
    return;
  }

  const currentOrder: OrderItem = {
    menuItemId: selectedItem.value.id,
    quantity: selectedQuantity.value,
    price: selectedItem.value.price,
    name: selectedItem.value.name,
    customizations: selectedCustomizations.value,
    customization_note: instructionNote.value.trim() || undefined,
  };

  const result = await orderStore.createOrder({
    table_id: tableData.value.id,
    table_name: tableData.value.name,
    items: currentOrder,
    total_price: selectedItem.value.price * selectedQuantity.value,
    status: "pending",
    is_billed: false,
    customer_note: null,
    order_type:
      selectedTakeout.value && isFoodItem(selectedItem.value)
        ? "takeout"
        : "dine_in",
    priority: "normal",
    created_at: new Date().toISOString(),
  });

  toastStore.open(result.message, result.success ? "success" : "error");

  if (result.success) {
    await menuStore.reduceTodayAvailability(
      selectedItem.value.id,
      selectedQuantity.value,
    );
  }

  showItemQuantity.value = false;
  selectedItem.value = null;
  selectedQuantity.value = 1;
  selectedOptionValues.value = {};
  instructionNote.value = "";
  selectedTakeout.value = false;
};
</script>

<template>
  <div class="min-h-screen bg-gray-100 pb-24">
    <div class="sticky top-0 z-50 bg-white shadow-md">
      <div class="p-3 border-b">
        <p class="text-sm text-gray-500">Self Order</p>
        <h1 class="text-2xl font-bold">Table {{ tableName }}</h1>
      </div>

      <div v-if="hasValidSession" class="flex gap-3 overflow-x-auto text-l p-2">
        <button
          v-for="category in categories"
          :key="category.id"
          class="py-2 px-3 rounded-full font-semibold transition-all duration-200 whitespace-nowrap"
          :class="{
            'bg-blue-500 text-white shadow-lg': activeCategoryId === category.id,
            'bg-gray-100 hover:bg-gray-200': activeCategoryId !== category.id,
          }"
          @click="activeCategoryId = category.id"
        >
          {{ category.name }}
        </button>
      </div>

    </div>

    <div
      v-if="!tableData"
      class="m-4 bg-white rounded-xl p-6 text-center text-red-500 shadow"
    >
      This table does not exist.
    </div>

    <div
      v-else-if="!hasActiveTableSession"
      class="m-4 bg-white rounded-2xl p-6 text-center shadow"
    >
      <h2 class="text-2xl font-bold text-gray-900">This table is not active</h2>
      <p class="mt-2 text-gray-500">
        Please ask staff to start your table session.
      </p>
    </div>

    <div
      v-else-if="!hasValidSession"
      class="m-4 bg-white rounded-2xl p-6 shadow"
    >
      <div class="text-center">
        <p class="text-sm font-bold uppercase text-gray-500">Table {{ tableName }}</p>
        <h2 class="mt-1 text-2xl font-bold text-gray-900">Enter Order PIN</h2>
        <p class="mt-2 text-gray-500">
          Ask staff for the current table PIN.
        </p>
      </div>

      <div class="mt-5 flex gap-2">
        <input
          v-model="sessionPinInput"
          inputmode="numeric"
          maxlength="4"
          class="min-w-0 flex-1 rounded-xl border px-4 py-3 text-center text-2xl font-bold tracking-widest"
          placeholder="0000"
          @keyup.enter="unlockSession"
        />

        <button
          class="rounded-xl bg-gray-900 px-5 py-3 font-bold text-white"
          @click="unlockSession"
        >
          Unlock
        </button>
      </div>
    </div>

    <template v-else>
      <div
        v-for="sub in activeSubCategories"
        :key="sub.id"
        :id="String(sub.id)"
        class="mb-12"
      >
        <div class="sticky top-[122px] z-30 mb-4">
          <div
            class="inline-block bg-yellow-300 px-3 py-1 rounded-r-xl shadow-md font-bold text-small"
          >
            {{ sub.name }}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 px-3">
          <div
            v-for="item in groupedMenu[sub.id]"
            :key="item.id"
            class="bg-white rounded-2xl p-4 shadow"
          >
            <div
              class="w-full h-40 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden"
            >
              <img
                v-if="item.image_url"
                :src="item.image_url"
                class="w-full h-full object-cover"
              />

              <div v-else class="flex flex-col items-center text-gray-400">
                <span class="text-sm">No Image</span>
              </div>
            </div>

            <h2 class="text-2xl font-bold mt-4">
              {{ item.name }}
            </h2>

            <p class="text-gray-500 mt-2">
              {{ item.description }}
            </p>

            <div class="flex flex-wrap gap-2 mt-3">
              <span
                v-if="getAvailabilityLabel(item)"
                class="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full"
                :class="{
                  'bg-amber-500':
                    getRemainingToday(item) !== null && getRemainingToday(item)! > 0,
                }"
              >
                {{ getAvailabilityLabel(item) }}
              </span>

              <span
                v-for="allergen in item.allergens"
                :key="`${item.id}-${allergen}`"
                class="bg-red-50 text-red-700 text-xs font-bold px-2 py-1 rounded-full"
              >
                {{ allergen }}
              </span>
            </div>

            <div class="flex justify-between items-center mt-4">
              <span class="text-xl font-bold">JPY {{ item.price }}</span>

              <button
                class="bg-black text-white px-4 py-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="isSoldOut(item)"
                @click="addItem(item)"
              >
                {{ isSoldOut(item) ? "Sold Out" : "Add" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <button
      v-if="callConfirmation"
      class="fixed inset-x-4 bottom-24 z-50 rounded-2xl bg-emerald-600 px-4 py-3 text-white shadow-2xl"
      @click="callConfirmation = ''"
    >
      <span class="block text-sm font-bold">{{ callConfirmation }}</span>
      <span class="block text-xs opacity-90">An employee will come shortly.</span>
    </button>

    <div
      v-if="hasValidSession"
      class="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-2xl"
    >
      <div
        class="max-w-3xl mx-auto p-3 flex items-center justify-between gap-3"
      >
        <div class="min-w-0">
          <p class="font-bold">
            My Orders: JPY {{ discountedTotal }}
          </p>
          <p class="text-xs text-gray-500 truncate">
            <span v-if="latestOrderPreview.length">
              {{
                latestOrderPreview
                  .map((item) => `${item.name} x${item.quantity}`)
                  .join(" | ")
              }}
            </span>
            <span v-else>Tap View to see your current order list.</span>
          </p>
        </div>

        <div class="flex shrink-0 gap-2">
          <button
            class="bg-rose-600 text-white px-3 py-2 rounded-xl whitespace-nowrap font-bold"
            @click="showCallMenu = true"
          >
            Call Staff
          </button>

          <button
            class="bg-gray-900 text-white px-3 py-2 rounded-xl whitespace-nowrap"
            @click="showOrders = true"
          >
            View Orders
          </button>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="showCallMenu && hasValidSession"
    class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
    @click.self="showCallMenu = false"
  >
    <div
      class="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:w-[460px] shadow-2xl overflow-hidden"
    >
      <div class="p-5 border-b flex items-start justify-between gap-4">
        <div>
          <p class="text-sm text-gray-500">Table {{ tableName }}</p>
          <h2 class="text-2xl font-bold">Call Employee</h2>
        </div>

        <button class="text-2xl leading-none" @click="showCallMenu = false">
          x
        </button>
      </div>

      <div class="p-5 space-y-3">
        <button
          v-for="option in callOptions"
          :key="option.type"
          class="w-full rounded-2xl border border-gray-200 p-4 text-left hover:border-gray-900 hover:bg-gray-50 transition"
          @click="sendServiceCall(option.type)"
        >
          <span class="block font-bold">{{ option.label }}</span>
          <span class="block text-sm text-gray-500">{{ option.description }}</span>
        </button>

        <textarea
          v-model="callNote"
          class="w-full border rounded-2xl p-3"
          rows="3"
          placeholder="Optional note"
        />
      </div>
    </div>
  </div>

  <div
    v-if="showOrders && hasValidSession"
    class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
  >
    <div
      class="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:w-[520px] max-h-[82vh] overflow-hidden shadow-2xl"
    >
      <div class="p-5 border-b flex justify-between items-start">
        <div>
          <h2 class="text-2xl font-bold">My Ordered Items</h2>
          <p class="text-sm text-gray-500">
            {{ myOrders.length }} orders in this session
          </p>
        </div>

        <button class="text-2xl" @click="showOrders = false">x</button>
      </div>

      <div class="p-5 overflow-y-auto max-h-[56vh]">
        <div v-if="orderedItems.length" class="divide-y divide-gray-100">
          <div
            v-for="item in orderedItems"
            :key="`${item.menuItemId}-${item.name}`"
            class="flex justify-between gap-3 py-3"
          >
            <div>
              <p class="font-semibold">{{ item.name }} x{{ item.quantity }}</p>
              <p class="text-xs text-gray-500">
                {{ Array.from(item.statuses).join(", ") }}
              </p>
              <p
                v-if="item.customizations?.length || item.customization_note"
                class="text-xs text-gray-600 mt-1"
              >
                {{
                  [
                    ...(item.customizations || []),
                    item.customization_note,
                  ]
                    .filter(Boolean)
                    .join(" | ")
                }}
              </p>
            </div>

            <p class="font-bold">JPY {{ item.lineTotal }}</p>
          </div>
        </div>

        <div v-else class="text-gray-500">
          Your ordered items will appear here after you add food or drinks.
        </div>

        <div
          v-if="orderedItems.length"
          class="mt-5 rounded-2xl bg-gray-50 p-4"
        >
          <p class="font-bold mb-3">Coupon</p>

          <div v-if="activeCoupon" class="flex items-center justify-between gap-3">
            <div>
              <p class="font-bold text-green-700">
                {{ activeCoupon.coupon_code }}
              </p>
              <p class="text-sm text-gray-500">
                Discount JPY {{ couponDiscount }}
              </p>
            </div>

            <button
              class="rounded-xl bg-gray-900 px-3 py-2 text-sm font-bold text-white"
              @click="removeCoupon"
            >
              Remove
            </button>
          </div>

          <div v-else class="flex gap-2">
            <input
              v-model="couponCode"
              class="min-w-0 flex-1 rounded-xl border px-3 py-2 uppercase"
              placeholder="Coupon code"
            />

            <button
              class="rounded-xl bg-green-600 px-4 py-2 font-bold text-white disabled:opacity-50"
              :disabled="applyingCoupon"
              @click="applyCoupon"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <div class="p-5 border-t space-y-2">
        <div class="flex justify-between text-gray-500">
          <span>Subtotal</span>
          <span>JPY {{ orderSubtotal }}</span>
        </div>

        <div
          v-if="couponDiscount"
          class="flex justify-between text-green-700 font-bold"
        >
          <span>Discount</span>
          <span>- JPY {{ couponDiscount }}</span>
        </div>

        <div class="flex justify-between items-center">
          <span class="text-gray-500">Current total</span>
          <span class="text-2xl font-bold">JPY {{ discountedTotal }}</span>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="showItemQuantity && hasValidSession"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-2xl p-6 w-[350px] shadow-xl">
      <h2 class="text-2xl font-bold mb-4">
        {{ selectedItem?.name }}
      </h2>

      <p class="text-gray-500 mb-4">Select quantity</p>

      <div class="flex items-center justify-center gap-4 mb-6">
        <button
          class="w-10 h-10 rounded-full bg-gray-200"
          @click="selectedQuantity = Math.max(1, selectedQuantity - 1)"
        >
          -
        </button>

        <span class="text-2xl font-bold">
          {{ selectedQuantity }}
        </span>

        <button
          class="w-10 h-10 rounded-full bg-black text-white"
          :class="{
            'opacity-40 cursor-not-allowed':
              selectedItem &&
              getRemainingToday(selectedItem) !== null &&
              selectedQuantity >= getRemainingToday(selectedItem)!,
          }"
          :disabled="
            selectedItem &&
            getRemainingToday(selectedItem) !== null &&
            selectedQuantity >= getRemainingToday(selectedItem)!
          "
          @click="selectedQuantity++"
        >
          +
        </button>
      </div>

      <label
        v-if="selectedItem && isFoodItem(selectedItem)"
        class="flex items-center gap-2 bg-amber-50 text-amber-800 rounded-xl px-3 py-3 mb-4 font-semibold"
      >
        <input v-model="selectedTakeout" type="checkbox" />
        <span>Takeout</span>
      </label>

      <div v-if="selectedItemOptionGroups.length" class="space-y-4 mb-4">
        <div v-for="group in selectedItemOptionGroups" :key="group.id">
          <p class="text-sm font-bold text-gray-700 mb-2">
            {{ group.name }}
            <span class="font-normal text-gray-400">
              {{ group.selection_type === "single" ? "choose one" : "choose any" }}
            </span>
          </p>

          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="option in menuStore.getOptionsForGroup(group.id)"
              :key="option.id"
              class="rounded-lg border px-2 py-2 text-sm font-semibold"
              :class="
                isOptionSelected(group.id, option.name)
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200'
              "
              @click="toggleOption(group.id, group.selection_type, option.name)"
            >
              {{ option.name }}
            </button>
          </div>
        </div>
      </div>

      <textarea
        v-model="instructionNote"
        class="w-full border rounded-xl p-3 mb-4"
        placeholder="Instructions, allergy note, or request"
      />

      <div class="flex gap-3">
        <button
          class="flex-1 border rounded-xl py-3"
          @click="showItemQuantity = false"
        >
          Cancel
        </button>

        <button
          class="flex-1 bg-green-500 text-white rounded-xl py-3 font-bold"
          @click="addItemFinal"
        >
          Add
        </button>
      </div>
    </div>
  </div>
</template>
