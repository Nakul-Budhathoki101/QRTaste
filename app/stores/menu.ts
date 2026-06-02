import { defineStore } from "pinia";
import { useSupabase } from "~/lib/supabase";
import type { MenuItem } from "~/types/menu";

export const useMenuStore = defineStore("menu", () => {
  const supabase = useSupabase();

  const menuItems = useState<MenuItem[]>("menuItems", () => []);

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

    menuItems.value = data || [];

    return {
      success: true,
      message: "Menu loaded",
    };
  };

  const createMenuItem = async (
    item: Omit<MenuItem, "id" | "created_at" | "is_active">,
  ) => {
    const { error } = await supabase.from("menu_items").insert([item]);

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
        main_category: item.main_category,
        sub_category: item.sub_category,
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

  return {
    menuItems,

    loadMenu,

    createMenuItem,
    updateMenuItem,
    removeMenuItem,
  };
});
