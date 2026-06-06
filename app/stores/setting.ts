import { defineStore } from "pinia";

const SETTINGS_KEY = "restaurant-app-settings";

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    restaurantName: "Hotel Table Service",
    defaultTimeLimit: 120,
    warningBeforeMinutes: 10,
    enableSoundAlert: true,
    taxRate: 10,
    currencyLabel: "JPY",
  }),

  actions: {
    loadSettings() {
      if (!import.meta.client) return;

      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return;

      try {
        Object.assign(this, JSON.parse(stored));
      } catch (error) {
        console.error("Failed to load settings", error);
      }
    },

    saveSettings() {
      if (!import.meta.client) return;

      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          restaurantName: this.restaurantName,
          defaultTimeLimit: this.defaultTimeLimit,
          warningBeforeMinutes: this.warningBeforeMinutes,
          enableSoundAlert: this.enableSoundAlert,
          taxRate: this.taxRate,
          currencyLabel: this.currencyLabel,
        }),
      );
    },
  },
});
