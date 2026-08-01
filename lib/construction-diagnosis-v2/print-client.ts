export function isInAppPrintBrowser(userAgent: string) {
  return /(Line\/|\bFBAN\b|\bFBAV\b|Instagram|Messenger|MicroMessenger|Twitter)/i.test(userAgent);
}
