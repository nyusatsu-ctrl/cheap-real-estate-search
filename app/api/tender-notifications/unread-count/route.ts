import { NextResponse } from "next/server";
import { getUnreadTenderNotificationCount } from "@/lib/tender-notifications";
import { canUseTenderAccess, getCurrentTenderAccess } from "@/lib/tender-access";

export async function GET() {
  const access = await getCurrentTenderAccess();
  if (!access || !canUseTenderAccess(access)) {
    return NextResponse.json({ count: 0 });
  }

  const count = await getUnreadTenderNotificationCount(access.userId);
  return NextResponse.json({ count });
}
