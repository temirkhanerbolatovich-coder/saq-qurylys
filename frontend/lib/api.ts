export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    cache: "no-store",
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.error?.message || "Не удалось загрузить данные",
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export async function command<T>(
  path: string,
  body?: unknown,
  key?: string,
): Promise<T> {
  const csrf = await api<{ csrf_token: string }>("/auth/csrf");
  return api<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf.csrf_token,
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function date(value: string | null) {
  if (!value) return "Не установлена";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Qyzylorda",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
