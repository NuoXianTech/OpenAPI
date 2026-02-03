// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      startTime: process.env.START_TIME || "2026-01-01 00:00:00",
      apiImg:
        process.env.API_IMG || "https://q1.qlogo.cn/g?b=qq&nk=1428309052&s=640",
      apiName: process.env.API_NAME || "OpenAPI",
      apiDescription:
        process.env.API_DESCRIPTION ||
        "OpenAPI是免费为用户提供网络数据接口调用的服务平台。",
    },
  },
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["./app/assets/css/main.css"],
  modules: ["@nuxthub/core"],
  vite: {
    plugins: [tailwindcss()],
  },
  hub: {
    db: "postgresql",
  },
});
