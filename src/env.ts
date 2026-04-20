const raw = import.meta.env.VITE_YAP_BASE_URL ?? "http://localhost:3001/api/v1";

export const YAP_BASE_URL: string = raw.replace(/\/+$/, "");
export const YAP_TOKEN: string = import.meta.env.VITE_YAP_TOKEN ?? "";
