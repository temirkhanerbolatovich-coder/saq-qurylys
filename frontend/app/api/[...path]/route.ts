import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

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
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      redirect: "manual",
      cache: "no-store",
      body: request.method === "GET" ? undefined : await request.arrayBuffer(),
      signal: AbortSignal.timeout(15000),
    });
    const resultHeaders = new Headers();
    for (const name of [
      "content-type",
      "content-disposition",
      "x-request-id",
      "x-content-type-options",
      "retry-after",
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
