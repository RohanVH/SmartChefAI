import axios from "axios";

const API_BASE_URL = "/api";

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (axios.isAxiosError(error)) {
    const serverMessage = error.response?.data?.error || error.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (error.code === "ECONNABORTED") return "The request took too long. Please try again.";
    if (!error.response) return "Unable to reach SmartChefAI right now. Please try again.";
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("smartchefai_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    error.userMessage = getApiErrorMessage(error);
    return Promise.reject(error);
  }
);

export default api;

