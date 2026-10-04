import { API_BASE_URL } from "../utils/constants";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEY_AUTH_TOKEN = "@otium_auth_token";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  skipAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, ""); // Remove trailing slash
  }

  /**
   * Lazily restore authentication token from SecureStore or AsyncStorage if in-memory cache is empty
   */
  public async getOrRestoreAuthToken(): Promise<string | null> {
    if (this.authToken) return this.authToken;
    try {
      let token = await SecureStore.getItemAsync("jwt");
      if (!token) {
        token = await AsyncStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
      }
      if (token) {
        this.authToken = token;
        return token;
      }
    } catch {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
        if (token) {
          this.authToken = token;
          return token;
        }
      } catch {}
    }
    return null;
  }

  /**
   * Set bearer authentication token for subsequent requests and persist to SecureStore & AsyncStorage
   */
  public setAuthToken(token: string | null) {
    this.authToken = token;
    if (token) {
      SecureStore.setItemAsync("jwt", token).catch(() => {});
      AsyncStorage.setItem(STORAGE_KEY_AUTH_TOKEN, token).catch(() => {});
    } else {
      SecureStore.deleteItemAsync("jwt").catch(() => {});
      AsyncStorage.removeItem(STORAGE_KEY_AUTH_TOKEN).catch(() => {});
    }
  }

  /**
   * Retrieve active bearer authentication token
   */
  public getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Remove active bearer authentication token
   */
  public clearAuthToken() {
    this.setAuthToken(null);
  }

  /**
   * Internal request handler with header assembly and error normalization
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const isFormData =
      Boolean(options.body) &&
      (options.body instanceof FormData ||
        (typeof options.body === "object" && typeof (options.body as any).append === "function") ||
        typeof (options.body as any)?._parts !== "undefined");

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (isFormData) {
      delete headers["Content-Type"];
      delete headers["content-type"];
    } else if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    // Lazily restore and inject Bearer Authorization header if token is available
    if (!options.skipAuth) {
      const token = await this.getOrRestoreAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const timeout = options.timeoutMs || 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseData: any = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        try {
          responseData = JSON.parse(text);
        } catch {
          responseData = { message: text };
        }
      }

      if (!response.ok) {
        let rawError: any = responseData?.error;
        if (typeof rawError === "object" && rawError !== null) {
          rawError = rawError.message || rawError.error || rawError.name || JSON.stringify(rawError);
        }
        if (!rawError) {
          let rawMsg: any = responseData?.message;
          if (typeof rawMsg === "object" && rawMsg !== null) {
            rawMsg = rawMsg.message || JSON.stringify(rawMsg);
          }
          rawError = rawMsg;
        }
        if (typeof rawError !== "string" || !rawError) {
          rawError = `HTTP ${response.status}: Request failed.`;
        }

        if (
          typeof rawError === "string" &&
          (rawError.trim().startsWith("<") || rawError.includes("<!DOCTYPE") || rawError.includes("<html"))
        ) {
          if (response.status === 404) {
            rawError = "Service endpoint not found on server (HTTP 404). Backend deployment required.";
          } else if (response.status >= 500) {
            rawError = `Server error (HTTP ${response.status}). The server encountered an error processing your request.`;
          } else {
            rawError = `HTTP ${response.status}: Request failed.`;
          }
        }

        // Sanitize database / connection pool errors for security and clean UI
        if (
          typeof rawError === "string" &&
          (rawError.includes("prisma.") || rawError.includes("connection pool") || rawError.includes("Invocation:") || rawError.includes("P2024"))
        ) {
          rawError = "Campus server is temporarily busy. Please try again in a few moments.";
        }

        return {
          success: false,
          error: String(rawError),
          status: response.status,
          data: responseData,
        };
      }

      const isSuccess = responseData?.success !== undefined ? Boolean(responseData.success) : true;
      let respError: string | undefined = undefined;
      if (!isSuccess && responseData?.error) {
        respError = typeof responseData.error === "object"
          ? responseData.error.message || JSON.stringify(responseData.error)
          : String(responseData.error);
        if (
          respError &&
          (respError.includes("prisma.") || respError.includes("connection pool") || respError.includes("Invocation:") || respError.includes("P2024"))
        ) {
          respError = "Campus server is temporarily busy. Please try again in a few moments.";
        }
      }

      return {
        success: isSuccess,
        data: responseData?.data !== undefined ? responseData.data : responseData,
        error: respError,
        status: response.status,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        return {
          success: false,
          error: "Request timed out. Please check your network connection.",
          status: 408,
        };
      }

      let errMessage = error?.message;
      if (typeof errMessage === "object" && errMessage !== null) {
        errMessage = (errMessage as any).message || JSON.stringify(errMessage);
      }
      if (typeof errMessage !== "string" || !errMessage) {
        errMessage = "Network request failed. Is the server running?";
      }

      return {
        success: false,
        error: String(errMessage),
        status: 0,
      };
    }
  }

  /**
   * Helper to check if body is FormData
   */
  private isFormDataBody(body: any): boolean {
    return Boolean(
      body &&
      (body instanceof FormData ||
        (typeof body === "object" && typeof body.append === "function") ||
        typeof body?._parts !== "undefined")
    );
  }

  /**
   * HTTP GET Request
   */
  public async get<T = any>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    });
  }

  /**
   * HTTP POST Request
   */
  public async post<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const isFormData = this.isFormDataBody(body);
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * HTTP PUT Request
   */
  public async put<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const isFormData = this.isFormDataBody(body);
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * HTTP PATCH Request
   */
  public async patch<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const isFormData = this.isFormDataBody(body);
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * HTTP DELETE Request
   */
  public async delete<T = any>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }

  /**
   * HTTP POST Multipart / FormData Upload
   */
  public async upload<T = any>(
    endpoint: string,
    formData: FormData,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: formData,
      timeoutMs: options?.timeoutMs || 90000, // 90s for document upload
    });
  }

  /**
   * Alias for upload() supporting FormData requests
   */
  public async postFormData<T = any>(
    endpoint: string,
    formData: FormData,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.upload<T>(endpoint, formData, options);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
