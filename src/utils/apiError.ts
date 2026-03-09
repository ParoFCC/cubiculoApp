export function stringifyApiErrorDetail(detail: unknown): string {
  if (detail == null) {
    return "";
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => stringifyApiErrorDetail(item))
      .filter(Boolean)
      .join("\n");
  }

  if (typeof detail === "object") {
    const record = detail as Record<string, unknown>;

    if (typeof record.msg === "string") {
      if (Array.isArray(record.loc) && record.loc.length > 0) {
        const field = record.loc
          .filter((part) => typeof part === "string" || typeof part === "number")
          .join(".");
        return field ? `${field}: ${record.msg}` : record.msg;
      }
      return record.msg;
    }

    if (typeof record.detail === "string" || Array.isArray(record.detail)) {
      return stringifyApiErrorDetail(record.detail);
    }
  }

  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  const detail = (error as any)?.response?.data?.detail;
  const message = stringifyApiErrorDetail(detail || (error as any)?.message);
  return message || fallback;
}