import { defineStore } from "pinia";
import { useSupabase } from "~/lib/supabase";
import type {
  MenuDailyAvailability,
  MenuItem,
  MenuOptionGroup,
  MenuOptionItem,
} from "~/types/menu";

export const useMenuStore = defineStore("menu", () => {
  const supabase = useSupabase();

  const menuItems = ref<MenuItem[]>([]);
  const dailyAvailability = ref<MenuDailyAvailability[]>([]);
  const optionGroups = ref<MenuOptionGroup[]>([]);
  const optionItems = ref<MenuOptionItem[]>([]);
  const menuItemOptionGroups = ref<
    { menu_item_id: number; option_group_id: number }[]
  >([]);

  const getServiceDate = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const loadMenu = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("id");

    if (error) {
      console.error(error);

      return {
        success: false,
        message: "Failed to load menu",
      };
    }

    menuItems.value = (data || []).map((item: any) => ({
      ...item,
      allergens: Array.isArray(item.allergens) ? item.allergens : [],
      is_sold_out: item.is_sold_out ?? false,
    }));

    return {
      success: true,
      message: "Menu loaded",
    };
  };

  const createMenuItem = async (
    item: Omit<MenuItem, "id" | "created_at" | "is_active" | "is_sold_out"> &
      Partial<Pick<MenuItem, "is_sold_out">>,
  ) => {
    const { data, error } = await supabase
      .from("menu_items")
      .insert([
        {
          ...item,
          allergens: item.allergens ?? [],
          is_sold_out: item.is_sold_out ?? false,
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error(error);

      return {
        success: false,
        message: "Failed to create menu item",
      };
    }

    await loadMenu();

    return {
      success: true,
      message: "Menu item created",
      itemId: data?.id as number | undefined,
    };
  };

  const updateMenuItem = async (item: MenuItem) => {
    const { error } = await supabase
      .from("menu_items")
      .update({
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image_url,
        category_id: item.category_id,
        sub_category_id: item.sub_category_id,
        is_sold_out: item.is_sold_out,
        allergens: item.allergens ?? [],
      })
      .eq("id", item.id);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: "Failed to update menu item",
      };
    }

    await loadMenu();

    return {
      success: true,
      message: "Menu item updated",
    };
  };

  const removeMenuItem = async (id: number) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: "Failed to delete menu item",
      };
    }

    await loadMenu();

    return {
      success: true,
      message: "Menu item deleted",
    };
  };

  const loadTodayAvailability = async () => {
    const { data, error } = await supabase
      .from("menu_daily_availability")
      .select("*")
      .eq("service_date", getServiceDate())
      .order("menu_item_id");

    if (error) {
      console.error(error);

      return {
        success: false,
        message: "Failed to load today's availability",
      };
    }

    dailyAvailability.value = data || [];

    return {
      success: true,
      message: "Today's availability loaded",
    };
  };

  const loadOptionGroups = async () => {
    const [{ data: groups, error: groupError }, { data: items, error: itemError }, { data: links, error: linkError }] =
      await Promise.all([
        supabase
          .from("menu_option_groups")
          .select("*")
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("menu_option_items")
          .select("*")
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
        supabase.from("menu_item_option_groups").select("*"),
      ]);

    const error = groupError || itemError || linkError;

    if (error) {
      console.error(error);
      return {
        success: false,
        message: error.message,
      };
    }

    optionGroups.value = groups || [];
    optionItems.value = items || [];
    menuItemOptionGroups.value = links || [];

    return {
      success: true,
      message: "Option groups loaded",
    };
  };

  const createOptionGroup = async (
    name: string,
    selectionType: "single" | "multiple",
  ) => {
    const { error } = await supabase.from("menu_option_groups").insert([
      {
        name,
        selection_type: selectionType,
        is_active: true,
      },
    ]);

    if (error) return { success: false, message: error.message };

    await loadOptionGroups();
    return { success: true, message: "Option group added" };
  };

  const deleteOptionGroup = async (groupId: number) => {
    const { error } = await supabase
      .from("menu_option_groups")
      .delete()
      .eq("id", groupId);

    if (error) return { success: false, message: error.message };

    await loadOptionGroups();
    return { success: true, message: "Option group deleted" };
  };

  const createOptionItem = async (groupId: number, name: string) => {
    const { error } = await supabase.from("menu_option_items").insert([
      {
        group_id: groupId,
        name,
        is_active: true,
      },
    ]);

    if (error) return { success: false, message: error.message };

    await loadOptionGroups();
    return { success: true, message: "Option added" };
  };

  const deleteOptionItem = async (optionId: number) => {
    const { error } = await supabase
      .from("menu_option_items")
      .delete()
      .eq("id", optionId);

    if (error) return { success: false, message: error.message };

    await loadOptionGroups();
    return { success: true, message: "Option deleted" };
  };

  const setMenuItemOptionGroups = async (
    menuItemId: number,
    optionGroupIds: number[],
  ) => {
    const { error: deleteError } = await supabase
      .from("menu_item_option_groups")
      .delete()
      .eq("menu_item_id", menuItemId);

    if (deleteError) return { success: false, message: deleteError.message };

    if (optionGroupIds.length) {
      const { error: insertError } = await supabase
        .from("menu_item_option_groups")
        .insert(
          optionGroupIds.map((optionGroupId) => ({
            menu_item_id: menuItemId,
            option_group_id: optionGroupId,
          })),
        );

      if (insertError) return { success: false, message: insertError.message };
    }

    await loadOptionGroups();
    return { success: true, message: "Menu item options updated" };
  };

  const getOptionsForGroup = (groupId: number) =>
    optionItems.value.filter(
      (option) => option.group_id === groupId && option.is_active,
    );

  const getOptionGroupsForMenuItem = (menuItemId: number) => {
    const linkedGroupIds = new Set(
      menuItemOptionGroups.value
        .filter((link) => link.menu_item_id === menuItemId)
        .map((link) => link.option_group_id),
    );

    return optionGroups.value.filter(
      (group) => group.is_active && linkedGroupIds.has(group.id),
    );
  };

  const getOptionGroupIdsForMenuItem = (menuItemId: number) =>
    menuItemOptionGroups.value
      .filter((link) => link.menu_item_id === menuItemId)
      .map((link) => link.option_group_id);

  const setSoldOut = async (itemId: number, isSoldOut: boolean) => {
    const item = getMenuItemById(itemId);

    if (!item) {
      return {
        success: false,
        message: "Menu item not found",
      };
    }

    const { error } = await supabase
      .from("menu_items")
      .update({
        is_sold_out: isSoldOut,
      })
      .eq("id", itemId);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: "Failed to update availability",
      };
    }

    await loadMenu();

    return {
      success: true,
      message: isSoldOut ? "Item marked sold out" : "Item marked available",
    };
  };

  const getTodayAvailability = (itemId: number) =>
    dailyAvailability.value.find(
      (availability) =>
        availability.menu_item_id === itemId &&
        availability.service_date === getServiceDate(),
    ) || null;

  const getRemainingToday = (itemId: number) => {
    const availability = getTodayAvailability(itemId);

    if (!availability || availability.available_quantity === null) return null;
    return availability.remaining_quantity ?? availability.available_quantity;
  };

  const isAvailableForOrder = (item: MenuItem, quantity = 1) => {
    const availability = getTodayAvailability(item.id);
    if (!availability) return true;
    if (availability.is_sold_out) return false;
    if (availability.remaining_quantity === null) return true;

    return availability.remaining_quantity >= quantity;
  };

  const setTodayAvailability = async (
    item: MenuItem,
    availableQuantity: number | null,
  ) => {
    const serviceDate = getServiceDate();
    const normalizedQuantity =
      availableQuantity === null ? null : Math.max(0, Math.floor(availableQuantity));

    const { error } = await supabase
      .from("menu_daily_availability")
      .upsert(
        {
          menu_item_id: item.id,
          service_date: serviceDate,
          available_quantity: normalizedQuantity,
          remaining_quantity: normalizedQuantity,
          is_sold_out: normalizedQuantity === 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "menu_item_id,service_date" },
      );

    if (error) {
      console.error(error);

      return {
        success: false,
        message: "Failed to update today's availability",
      };
    }

    await loadTodayAvailability();

    return {
      success: true,
      message:
        normalizedQuantity === null
          ? `${item.name} is unlimited for today`
          : `${item.name} has ${normalizedQuantity} available today`,
    };
  };

  const reduceTodayAvailability = async (
    itemId: number,
    quantity: number,
  ) => {
    const availability = getTodayAvailability(itemId);

    if (!availability || availability.remaining_quantity === null) {
      return {
        success: true,
        message: "Unlimited availability",
      };
    }

    const nextRemaining = Math.max(
      0,
      availability.remaining_quantity - quantity,
    );

    const { error } = await supabase
      .from("menu_daily_availability")
      .update({
        remaining_quantity: nextRemaining,
        is_sold_out: nextRemaining <= 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", availability.id);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: "Failed to reduce today's availability",
      };
    }

    await loadTodayAvailability();

    return {
      success: true,
      message: "Today's availability updated",
    };
  };

  const getMenuItemById = (id: number) => {
    return menuItems.value.find((item) => item.id === id) || null;
  };
  return {
    menuItems,
    dailyAvailability,
    optionGroups,
    optionItems,
    menuItemOptionGroups,

    loadMenu,
    loadTodayAvailability,
    loadOptionGroups,

    createMenuItem,
    updateMenuItem,
    removeMenuItem,
    setSoldOut,
    setTodayAvailability,
    reduceTodayAvailability,
    createOptionGroup,
    deleteOptionGroup,
    createOptionItem,
    deleteOptionItem,
    setMenuItemOptionGroups,
    getTodayAvailability,
    getRemainingToday,
    isAvailableForOrder,
    getServiceDate,
    getOptionsForGroup,
    getOptionGroupsForMenuItem,
    getOptionGroupIdsForMenuItem,

    getMenuItemById,
  };
});
