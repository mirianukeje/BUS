export function getSafeRedirectPath(
  path: string | null | undefined,
  fallback = "/account",
) {
  if (
    !path ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    /[\u0000-\u001f]/.test(path)
  ) {
    return fallback;
  }

  try {
    const url = new URL(path, "http://localhost");
    return url.origin === "http://localhost"
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
