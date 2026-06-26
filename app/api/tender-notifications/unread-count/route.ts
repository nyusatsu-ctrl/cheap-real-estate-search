import { NextResponse } from "next/server";
import { getUnreadTenderNotificationCount } from "@/lib/tender-notifications";
import { canUseMemberFeatures } from "@/lib/tenders";
import { getCurrentMember } from "@/lib/user";

export async function GET() {
  const member = await getCurrentMember();
  if (!member || !canUseMemberFeatures(member)) {
    return NextResponse.json({ count: 0 });
  }

  const count = await getUnreadTenderNotificationCount(member.id);
  return NextResponse.json({ count });
}
