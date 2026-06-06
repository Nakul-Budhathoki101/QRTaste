import { defineStore } from "pinia";
import { useSupabase } from "~/lib/supabase";

import type { MenuCategory, MenuSubCategory } from "~/types/category";

export const useCategoryStore = defineStore("category", () => {
  const supabase = useSupabase();

  const categories = ref<MenuCategory[]>([]);

  const subCategories = ref<MenuSubCategory[]>([]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("menu_categories")
      .select("*")
      .order("name");

    if (error) {
      console.error(error);
      return;
    }

    categories.value = data || [];
  };

  const loadSubCategories = async () => {
    const { data, error } = await supabase
      .from("menu_sub_categories")
      .select("*")
      .order("name");

    if (error) {
      console.error(error);
      return;
    }

    subCategories.value = data || [];
  };

  const createCategory = async (name: string) => {
    const { error } = await supabase.from("menu_categories").insert([
      {
        name,
        is_active: true,
      },
    ]);

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    await loadCategories();
    await loadSubCategories();

    return {
      success: true,
      message: "Category added successfully",
    };
  };

  const updateCategory = async (id: number, name: string) => {
    const { error } = await supabase
      .from("menu_categories")
      .update({
        name,
      })
      .eq("id", id);

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    await loadCategories();

    return {
      success: true,
      message: "Category updated successfully",
    };
  };

  const deleteCategory = async (id: number) => {
    const { error } = await supabase
      .from("menu_categories")
      .delete()
      .eq("id", id);

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    await loadCategories();

    return {
      success: true,
      message: "Category deleted successfully",
    };
  };

  const createSubCategory = async (categoryId: number, name: string) => {
    const { error } = await supabase.from("menu_sub_categories").insert([
      {
        category_id: categoryId,
        name,
        is_active: true,
      },
    ]);

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    await loadSubCategories();

    return {
      success: true,
      message: "Sub category added successfully",
    };
  };

  const deleteSubCategory = async (id: number) => {
    const { error } = await supabase
      .from("menu_sub_categories")
      .delete()
      .eq("id", id);

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    await loadSubCategories();

    return {
      success: true,
      message: "Sub category deleted successfully",
    };
  };

  return {
    categories,
    subCategories,

    loadCategories,
    loadSubCategories,

    createCategory,
    updateCategory,
    deleteCategory,

    createSubCategory,
    deleteSubCategory,
  };
});
