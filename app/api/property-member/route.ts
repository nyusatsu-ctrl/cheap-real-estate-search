import { NextResponse } from "next/server";
import { getPropertyAccessPageState } from "@/lib/property-access";
import { getCurrentMember } from "@/lib/user";

export const dynamic = "force-dynamic";

export async function GET() {
  const member = await getCurrentMember();
  const headers = {
    "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate"
  };

  if (!member) {
    return NextResponse.json({ authenticated: false }, { headers });
  }

  return NextResponse.json(
    {
      authenticated: true,
      email: member.email,
      role: member.role,
      accessState: getPropertyAccessPageState(member.access)
    },
    { headers }
  );
}
