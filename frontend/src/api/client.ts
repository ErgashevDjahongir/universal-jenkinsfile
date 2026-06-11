import axios from "axios";

// Markazlashgan axios mijozi. Dev'da Vite proxy /api ni backendga yo'naltiradi.
// Prod'da VITE_API_URL ishlatiladi.
const baseURL = `${import.meta.env.VITE_API_URL ?? ""}/api`;

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});
