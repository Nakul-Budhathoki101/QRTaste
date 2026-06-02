import { defineStore } from "pinia";

export type ToastType = "success" | "error" | "info";

export const useToastStore = defineStore("toast", () => {
  const show = ref(false);

  const message = ref("");

  const type = ref<ToastType>("success");

  const open = (text: string, toastType: ToastType = "success") => {
    message.value = text;
    type.value = toastType;
    show.value = true;

    setTimeout(() => {
      close();
    }, 2500);
  };

  const close = () => {
    show.value = false;
  };

  return {
    show,
    message,
    type,

    open,
    close,
  };
});
