/** Recording tests must use an explicitly disposable HTTP installation. */
const { URL } = globalThis;

export function assertIsolatedE2E(environment) {
  const target =
    environment.SAQ_E2E_BASE_URL ||
    environment.PLAYWRIGHT_BASE_URL ||
    "http://localhost:3000";
  const url = new URL(target);
  if (
    environment.SAQ_ISOLATED_ACCEPTANCE !== "1" ||
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !url.port ||
    ["3000", "8000", "55432"].includes(url.port) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "E2E requires SAQ_ISOLATED_ACCEPTANCE=1 and a disposable loopback HTTP origin on a separate port (for example 3090). Use its own .env, database and storage.",
    );
  }
  return url.origin;
}
