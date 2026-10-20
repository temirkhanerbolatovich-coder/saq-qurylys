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

export function date(
  value: string | null,
  locale: "ru" | "kk" = typeof document !== "undefined" &&
  document.documentElement.lang === "kk"
    ? "kk"
    : "ru",
) {
  const instant = value ? new Date(value) : null;
  if (!instant || !Number.isFinite(instant.getTime()))
    return locale === "kk" ? "Анықталмаған" : "Не установлена";
  return new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-RU", {
    timeZone: "Asia/Qyzylorda",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(instant);
}

export async function upload<T>(
  path: string,
  body: FormData,
  key: string,
): Promise<T> {
  const csrf = await api<{ csrf_token: string }>("/auth/csrf");
  return api<T>(path, {
    method: "POST",
    headers: { "X-CSRF-Token": csrf.csrf_token, "Idempotency-Key": key },
    body,
  });
}
