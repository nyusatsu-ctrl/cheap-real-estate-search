import { redirect } from "next/navigation";

export default function PremiumAdjustPage() {
  // プレミアの機械印字は許可されていないため、位置調整画面も公開しない。
  redirect("/loan/forms/premium");
}
