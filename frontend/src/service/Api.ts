const urlBase = import.meta.env.VITE_API_URL as string;
const STORAGE_KEY = 'app:auth';

interface AuthStorage {
  token?: string;
  usuarioId?: string;
}

interface CacheItem {
  url: string;
  data: unknown;
}

interface ApiError {
  errorMessage?: string;
  message?: string;
  details?: string;
  stackTrace?: string;
  exceptionName?: string;
  detalhes?: { campo?: string; mensagem: string }[];
}

export interface ApiErrorResult {
  message: string;
  exceptionName: string;
  details: string;
  stack: string;
}

class Api {
  cache: CacheItem[] = [];
  loading = false;

  // Ganchos registrados pela AppErrorBridge (fora do React não dá pra usar
  // hooks). tratarErro mostra o alerta central; tratarErroAuth desloga.
  tratarErro?: (mensagem: string) => void;
  tratarErroAuth?: () => void;

  constructor() {
    this.insertToCache = this.insertToCache.bind(this);
    this.getFromCache = this.getFromCache.bind(this);
    this.getAll = this.getAll.bind(this);
    this.startLoading = this.startLoading.bind(this);
    this.finishLoading = this.finishLoading.bind(this);
  }

  insertToCache = (url: string, data: unknown): void => {
    const existing = this.cache.findIndex((i) => i.url === url);
    if (existing === -1) {
      this.cache.push({ url, data });
    } else {
      this.cache[existing] = { url, data };
    }
  };

  getFromCache = (url: string): CacheItem | null => {
    return this.cache.find((i) => i.url === url) ?? null;
  };

  urlBase = (): string => urlBase;

  getOptions = (customHeaders?: Record<string, string>): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const auth = JSON.parse(raw) as AuthStorage;
        if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      }
    } catch {
      // sem sessão
    }

    return headers;
  };

  startLoading = (): void => {
    this.loading = true;
    const el = document.getElementById('loading');
    if (el) el.className = 'loadingDiv';
  };

  finishLoading = (): void => {
    this.loading = false;
    const el = document.getElementById('loading');
    if (el) el.className = 'loadingDiv hide';
  };

  // ========= HTTP =========

  post = <T>(url: string, data: unknown, useProgress = true, showErrors = true, headers?: Record<string, string>): Promise<T> =>
    new Promise((resolve, reject) => {
      if (useProgress) this.startLoading();
      fetch(urlBase + url, {
        method: 'POST',
        headers: this.getOptions(headers),
        body: JSON.stringify(data),
      })
        .then((res) => this.parseResponse<T>(res))
        .then((result) => {
          this.finishLoading();
        resolve(result);
        })
        .catch((e: unknown) => {
          this.finishLoading();
          this.handleErrorMessage(e, reject, showErrors);
        });
    });

  put = <T>(url: string, data: unknown, useProgress = true, showErrors = true, headers?: Record<string, string>): Promise<T> =>
    new Promise((resolve, reject) => {
      if (useProgress) this.startLoading();
      fetch(urlBase + url, {
        method: 'PUT',
        headers: this.getOptions(headers),
        body: JSON.stringify(data),
      })
        .then((res) => this.parseResponse<T>(res))
        .then((result) => {
          this.finishLoading();
          resolve(result);
        })
        .catch((e: unknown) => {
          this.finishLoading();
          this.handleErrorMessage(e, reject, showErrors);
        });
    });

  patch = <T>(url: string, data?: unknown, useProgress = true, showErrors = true, headers?: Record<string, string>): Promise<T> =>
    new Promise((resolve, reject) => {
      if (useProgress) this.startLoading();
      fetch(urlBase + url, {
        method: 'PATCH',
        headers: this.getOptions(headers),
        ...(data ? { body: JSON.stringify(data) } : {}),
      })
        .then((res) => this.parseResponse<T>(res))
        .then((result) => {
          this.finishLoading();
          resolve(result);
        })
        .catch((e: unknown) => {
          this.finishLoading();
          this.handleErrorMessage(e, reject, showErrors);
        });
    });

  delete = <T>(url: string, data?: unknown, useProgress = true, showErrors = true): Promise<T> =>
    new Promise((resolve, reject) => {
      if (useProgress) this.startLoading();
      fetch(urlBase + url, {
        method: 'DELETE',
        headers: this.getOptions(),
        ...(data ? { body: JSON.stringify(data) } : {}),
      })
        .then((res) => this.parseResponse<T>(res))
        .then((result) => {
          this.finishLoading();
          resolve(result);
        })
        .catch((e: unknown) => {
          this.finishLoading();
          this.handleErrorMessage(e, reject, showErrors);
        });
    });

  get = <T>(url: string, useCache = false, useProgress = true, showErrors = true): Promise<T> =>
    new Promise((resolve, reject) => {
      const cachedResult = useCache ? this.getFromCache(url) : null;

      if (!cachedResult) {
        if (useProgress) this.startLoading();
        fetch(urlBase + url, {
          method: 'GET',
          headers: this.getOptions(),
        })
          .then((res) => this.parseResponse<T>(res))
          .then((result) => {
            this.finishLoading();
            if (useCache) this.insertToCache(url, result);
            resolve(Array.isArray(result) && result.length > 0 ? (result[0] as T) : result);
          })
          .catch((e: unknown) => {
            this.finishLoading();
            this.handleErrorMessage(e, reject, showErrors);
          });
      } else {
        resolve(cachedResult.data as T);
      }
    });

  getAll = <T>(url: string, useCache = false, useProgress = true, showErrors = true): Promise<T> =>
    new Promise((resolve, reject) => {
      const cachedResult = useCache ? this.getFromCache(url) : null;

      if (!cachedResult) {
        if (useProgress) this.startLoading();
        fetch(urlBase + url, {
          method: 'GET',
          headers: this.getOptions(),
        })
          .then((res) => this.parseResponse<T>(res))
          .then((result) => {
            this.finishLoading();
            if (useCache) this.insertToCache(url, result);
            resolve(result);
          })
          .catch((e: unknown) => {
            this.finishLoading();
            this.handleErrorMessage(e, reject, showErrors);
          });
      } else {
        resolve(cachedResult.data as T);
      }
    });

  query = <T>(url: string, queryParams: Record<string, unknown>, useProgress = true, showErrors = true): Promise<T> =>
    new Promise((resolve, reject) => {
      const qs = Object.entries(queryParams)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
      const fullUrl = qs ? `${urlBase}${url}?${qs}` : urlBase + url;

      if (useProgress) this.startLoading();
      fetch(fullUrl, {
        method: 'GET',
        headers: this.getOptions(),
      })
        .then((res) => this.parseResponse<T>(res))
        .then((result) => {
          this.finishLoading();
          resolve(result);
        })
        .catch((e: unknown) => {
          this.finishLoading();
          this.handleErrorMessage(e, reject, showErrors);
        });
    });

  // ========= Resposta =========

  private parseResponse = async <T>(res: Response): Promise<T> => {
    if (!res.ok) {
      let body: ApiError = {};
      try {
        body = (await res.json()) as ApiError;
      } catch {
        // sem body JSON
      }
      const err = Object.assign(new Error(), {
        response: {
          status: res.status,
          statusText: res.statusText,
          data: body,
        },
      });
      throw err;
    }
    return res.json() as Promise<T>;
  };

  // ========= Erros =========

  handleErrorMessage = (error: unknown, reject?: (reason: ApiErrorResult) => void, showErrors = true): void => {
    const message = this.getErrorMessage(error);
    const details = this.getErrorDetails(error);
    const stack = this.getErrorStack(error);
    const exceptionName = this.getExceptionName(error);
    const status = this.getStatus(error);

    console.error(`[API] ${message}`, { status, details, stack });

    // Erro de autenticação/autorização: desloga sempre (Firebase + front) e
    // avisa, independentemente de showErrors — sessão inválida é sempre crítica.
    if (status === 401 || status === 403) {
      this.tratarErroAuth?.();
      this.tratarErro?.("Sua sessão expirou ou você não tem acesso. Entre novamente.");
    } else if (showErrors) {
      this.tratarErro?.(message);
    }

    if (reject) {
      reject({ message, exceptionName, details, stack });
    }
  };

  getStatus = (error: unknown): number | undefined => {
    const e = error as { response?: { status?: number } };
    return e?.response?.status;
  };

  getErrorMessage = (error: unknown): string => {
    const e = error as { response?: { data?: ApiError; statusText?: string }; message?: string };
    let mensagem = '';

    // Erros de validação vêm com `detalhes` (campo + mensagem). Mostra a
    // mensagem do detalhe em vez do genérico "Dados inválidos".
    const detalhes = e?.response?.data?.detalhes;
    if (detalhes && detalhes.length > 0) {
      return detalhes.map((d) => d.mensagem).join(', ');
    }

    if (e?.response?.data?.errorMessage) {
      mensagem = e.response.data.errorMessage;
    } else if (e?.response?.data?.message) {
      mensagem = e.response.data.message;
    } else if (e?.response?.statusText) {
      mensagem = e.response.statusText;
    } else if (e?.message) {
      mensagem = e.message;
    }

    if (mensagem === 'Failed to fetch') {
      mensagem = 'Não foi possível conectar ao servidor. Verifique a conexão com a internet e tente novamente.';
    }

    return mensagem;
  };

  getErrorDetails = (error: unknown): string => {
    const e = error as { response?: { data?: ApiError } };
    return e?.response?.data?.details ?? '';
  };

  getErrorStack = (error: unknown): string => {
    const e = error as { response?: { data?: ApiError } };
    return e?.response?.data?.stackTrace ?? '';
  };

  getExceptionName = (error: unknown): string => {
    const e = error as { response?: { data?: ApiError } };
    return e?.response?.data?.exceptionName ?? '';
  };
}

const api = new Api();
export default api;
