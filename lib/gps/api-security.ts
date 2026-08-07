export type GpsApiRequestError = {
  status: 400 | 403 | 415;
  message: string;
};

export function validateGpsApiMutationRequest(request: Request): GpsApiRequestError | null {
  if (!isSameOriginRequest(request)) {
    return { status: 403, message: "この送信元からのGPS操作は許可されていません。" };
  }

  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return { status: 415, message: "Content-Typeはapplication/jsonを指定してください。" };
  }

  return null;
}

export async function parseGpsJsonObject(
  request: Request
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: GpsApiRequestError }> {
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: { status: 400, message: "JSONオブジェクトを指定してください。" } };
    }
    return { ok: true, data: value as Record<string, unknown> };
  } catch {
    return { ok: false, error: { status: 400, message: "JSONの形式が不正です。" } };
  }
}

export function getGpsApiAuthError(status: "unauthenticated" | "forbidden" | "unavailable") {
  if (status === "unauthenticated") {
    return { status: 401 as const, message: "管理者ログインが必要です。" };
  }
  if (status === "forbidden") {
    return { status: 403 as const, message: "GPS管理者権限がありません。" };
  }
  return { status: 500 as const, message: "GPS管理認証を確認できませんでした。" };
}

function isSameOriginRequest(request: Request) {
  const originHeader = request.headers.get("origin");
  if (!originHeader || originHeader === "null") return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;

  try {
    const origin = new URL(originHeader);
    const requestUrl = new URL(request.url);
    const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
    const host = forwardedHost || request.headers.get("host") || requestUrl.host;
    const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto"));
    const protocol = forwardedProto ? `${forwardedProto}:` : requestUrl.protocol;

    return origin.host === host && origin.protocol === protocol;
  } catch {
    return false;
  }
}

function firstForwardedValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}
