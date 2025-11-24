export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "晨陽學習成長評核分析系統";

export const APP_LOGO =
  import.meta.env.VITE_APP_LOGO ||
  "/chenyang-logo.jpeg";

// Generate login URL for Google OAuth
export const getLoginUrl = () => {
  return "/api/auth/google";
};
