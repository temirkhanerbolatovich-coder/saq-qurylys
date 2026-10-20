import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function proxyTimeout(method: string, path: string[]): number {
  const pdfDownload =
    method === "GET" &&
    ((path.length === 4 &&
      ((path[1] === "properties" && path[3] === "report.pdf") ||
        (path[1] === "signals" && path[3] === "pdf"))) ||
      (path.length === 5 && path[1] === "exports" && path[4] === "pdf"));
  if (!pdfDownload) return 15_000;
  const configured = Number(process.env.PDF_PROXY_TIMEOUT_MS || "75000");
  return Number.isSafeInteger(configured) &&
    configured >= 1 &&
    configured <= 75_000
    ? configured
    : 75_000;
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (path[0] !== "v1" || path.some((part) => part === ".."))
    return new Response(null, { status: 404 });
  const base = process.env.API_INTERNAL_URL || "http://127.0.0.1:8000";
  const target = new URL(
    `/api/${path.map(encodeURIComponent).join("/")}`,
    base,
  );
  target.search = request.nextUrl.search;
  const headers = new Headers();
  for (const name of [
    "content-type",
    "cookie",
    "origin",
    "x-csrf-token",
    "idempotency-key",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const limit =
      path.join("/") === "v1/monitoring/open-registry"
        ? 5_242_880 + 65_536
        : path.at(-1) === "upload"
          ? 10_485_760 + 65_536
          : 500_000;
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = request.body?.getReader();
    if (reader) {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        total += part.value.byteLength;
        if (total > limit) {
          await reader.cancel();
          const requestId = crypto.randomUUID();
          return Response.json(
            {
              error: {
                code: "HTTP_413",
                message: "Материал превышает допустимый размер",
                request_id: requestId,
                fields: [],
              },
            },
            {
              status: 413,
              headers: {
                "X-Request-ID": requestId,
                "Cache-Control": "no-store",
              },
            },
          );
        }
        chunks.push(part.value);
      }
    }
    const body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const deadline = AbortSignal.timeout(proxyTimeout(request.method, path));
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      redirect: "manual",
      cache: "no-store",
      body: request.method === "GET" ? undefined : body,
      signal: request.signal
        ? AbortSignal.any([request.signal, deadline])
        : deadline,
    });
    const resultHeaders = new Headers();
    for (const name of [
      "content-type",
      "content-disposition",
      "x-request-id",
      "x-content-type-options",
      "retry-after",
      "content-security-policy",
    ]) {
      const value = upstream.headers.get(name);
      if (value) resultHeaders.set(name, value);
    }
    resultHeaders.set("Cache-Control", "no-store");
    for (const cookie of upstream.headers.getSetCookie())
      resultHeaders.append("Set-Cookie", cookie);
    return new Response(upstream.body, {
      status: upstream.status,
      headers: resultHeaders,
    });
  } catch {
    const requestId = crypto.randomUUID();
    return Response.json(
      {
        error: {
          code: "API_UNAVAILABLE",
          message: "API недоступен. Повторите позже.",
          request_id: requestId,
          fields: [],
        },
      },
      {
        status: 503,
        headers: { "X-Request-ID": requestId, "Cache-Control": "no-store" },
      },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
