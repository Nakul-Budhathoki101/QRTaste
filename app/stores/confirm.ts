import { defineStore } from "pinia";

export const useConfirmStore = defineStore("confirm", () => {
  const show = ref(false);

  const title = ref("");

  const message = ref("");

  let resolver: ((value: boolean) => void) | null = null;

  const confirm = ({
    title: confirmTitle,
    message: confirmMessage,
  }: {
    title: string;
    message: string;
  }) => {
    title.value = confirmTitle;
    message.value = confirmMessage;

    show.value = true;

    return new Promise<boolean>((resolve) => {
      resolver = resolve;
    });
  };

  const accept = () => {
    show.value = false;
    resolver?.(true);
    resolver = null;
  };

  const cancel = () => {
    show.value = false;
    resolver?.(false);
    resolver = null;
  };

  return {
    show,
    title,
    message,

    confirm,
    accept,
    cancel,
  };
});
