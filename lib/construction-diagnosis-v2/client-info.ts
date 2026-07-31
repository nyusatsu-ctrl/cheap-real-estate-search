export function classifyDiagnosisClient(userAgent: string) {
  const ua = userAgent.toLowerCase();
  const deviceType = /iphone|android.+mobile|mobile/.test(ua)
    ? "スマートフォン"
    : /ipad|tablet/.test(ua)
      ? "タブレット"
      : "パソコン";
  const browserFamily = /line\//.test(ua)
    ? "LINE内ブラウザ"
    : /crios|chrome/.test(ua)
      ? "Chrome"
      : /safari/.test(ua) && !/chrome|crios/.test(ua)
        ? "Safari"
        : /firefox|fxios/.test(ua)
          ? "Firefox"
          : "その他";
  return { deviceType, browserFamily };
}
