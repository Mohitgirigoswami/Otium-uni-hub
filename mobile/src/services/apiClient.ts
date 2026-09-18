import { API_BASE_URL } from "../utils/constants";

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
   * Set bearer authentication token for subsequent requests
   */
  public setAuthToken(token: string | null) {
    this.authToken = token;
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
    this.authToken = null;
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

    const isFormData = options.body instanceof FormData;

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (!isFormData && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    // Inject Bearer Authorization header if token is available
    if (this.authToken && !options.skipAuth) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
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
        let rawError = responseData?.error || responseData?.message;
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

        return {
          success: false,
          error: rawError || `HTTP ${response.status}: Request failed.`,
          status: response.status,
          data: responseData,
        };
      }

      return {
        success: true,
        data: responseData?.data !== undefined ? responseData.data : responseData,
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

      return {
        success: false,
        error: error?.message || "Network request failed. Is the server running?",
        status: 0,
      };
    }
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
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
