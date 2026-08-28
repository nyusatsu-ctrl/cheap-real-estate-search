import type {
  EcontractCustomerSnapshot,
  EcontractDocumentSnapshot,
  EcontractImportantItem,
  VehicleConfirmationTerms
} from "./types";

export const PURCHASE_INTENT_VERSION = "purchase-intent-2026-08-v1";
export const VEHICLE_CONFIRMATION_VERSION = "vehicle-confirmation-2026-08-v1";

export const PURCHASE_INTENT_IMPORTANT_ITEMS: EcontractImportantItem[] = [
  { id: "approval_scope", text: "今回の審査可決は、自分自身の信用情報のみを理由とした一般的なローン承認ではないことを理解しました。" },
  { id: "dealer_transaction", text: "株式会社エコループを通じた当該取引についての審査結果であり、他店で同じ結果になる保証はないことを理解しました。" },
  { id: "purchase_intent", text: "株式会社エコループから車またはバイクを購入する意思があります。" },
  { id: "not_for_other_dealer", text: "審査可決だけを得て他店で購入する目的ではありません。" },
  { id: "contact_duty", text: "購入を中止する場合は連絡を途絶させず、株式会社エコループへ連絡します。" },
  { id: "unreachable_cancellation", text: "所定期間以上連絡が取れない場合、申込者都合のキャンセルとして扱われる場合があることを理解しました。" },
  { id: "cancellation_cost", text: "自己都合キャンセルの場合、3万円を基準とする費用および実費を、法令上認められる範囲で負担する場合があることを理解しました。" },
  { id: "second_confirmation", text: "車両確定後は、別途「個別車両購入確認」を行うことを理解しました。" }
];

export const VEHICLE_CONFIRMATION_IMPORTANT_ITEMS: EcontractImportantItem[] = [
  { id: "vehicle_details", text: "表示された車両の種類、メーカー、車名、グレード、型式、年式、走行距離および車台番号の記載段階を確認しました。" },
  { id: "price_details", text: "車両本体価格、諸費用、支払総額、頭金、下取充当額およびローン等申込額を確認しました。" },
  { id: "payment_details", text: "支払回数、第1回支払額、2回目以降支払額およびボーナス払いの有無・内容を確認しました。" },
  { id: "purchase_instruction", text: "この車両・この条件で購入手続を進め、株式会社エコループが落札、仕入、陸送、登録準備等へ進むことを承認します。" },
  { id: "post_confirmation_cost", text: "承認後の自己都合キャンセルでは、実際に発生した費用・損害を法令上認められる範囲で負担する場合があることを理解しました。" },
  { id: "separate_final_contracts", text: "この確認書は、別途締結される最終売買契約書、割賦契約書または信販契約等を置き換えるものではないことを理解しました。" }
];

export function buildPurchaseIntentDocument(customer: EcontractCustomerSnapshot, vehicleType: "car" | "bike"): EcontractDocumentSnapshot {
  const vehicleLabel = vehicleType === "bike" ? "バイク" : "自動車";
  const title = "自社ローン審査可決後 購入手続継続確認契約書";
  const sections = [
    section("第1条（当事者）", `株式会社エコループ（以下「当社」といいます。）と、申込者 ${customer.name} 様（以下「申込者」といいます。）は、次のとおり購入手続の継続を確認します。`),
    section("第2条（目的）", `本契約は、自社ローン審査可決後、申込者が当社から${vehicleLabel}を購入する意思を確認し、当社が希望条件の整理、車両探索その他の購入準備を開始するためのものです。本契約は、特定の車両についての最終売買契約そのものではありません。`),
    section("第3条（審査結果の範囲）", "今回の可決は、申込者本人の信用情報だけによる一般的・汎用的なローン承認を意味するものではなく、当社を販売店とする今回の取引に関する審査結果です。当社と提携先との取引関係、取引条件、販売・管理体制その他を含む総合判断となる場合があります。他店で同一条件の可決が得られる保証はなく、他店で購入する場合は改めて審査が必要です。当社は、審査会社の内部審査基準を保証または開示するものではありません。"),
    section("第4条（購入意思）", `申込者は、当社から${vehicleLabel}を購入する意思があり、単に審査可決だけを得て他店で購入する目的ではないことを確認します。`),
    section("第5条（車両探索）", "当社は、申込者の合理的な希望条件に沿う車両を、オークションその他の方法で探索します。車両決定まで1か月以上を要する場合があります。本契約自体に一律30日等の短い失効期限は設けません。ただし、審査会社が定める審査有効期限、再審査の要否、申込者の属性変更その他の事情は別途適用されます。"),
    section("第6条（連絡義務）", "申込者と当社は、電話、SMS、メール、LINEその他届出済みの方法で連絡します。申込者の最後の連絡または回答から3営業日以上連絡が取れない場合、当社は記録が残る方法で最終連絡を行います。その最終連絡後も3営業日以内に回答がない場合、当社は、個別事情を確認した上で申込者都合のキャンセルとして扱うことがあります。"),
    section("第7条（申込者都合のキャンセル費用）", "申込者都合で購入手続を中止する場合、当社は、3万円を基準とするキャンセル費用と、オークション関連費、落札後取消費、陸送費、登録準備費、検査費、外部業者への支払その他実際に発生した外部費用を請求することがあります。ただし、無条件に一律3万円を請求するものではなく、消費者契約法その他の強行法規に従い、当該解除によって当社に生ずべき平均的な損害その他法令上認められる範囲を上限とします。同一損害を重ねて請求しません。"),
    section("第8条（費用請求の除外）", "当社側の事情で購入手続を継続できない場合、申込者の合理的な希望条件に合う車両を用意できない場合、その他申込者の責めに帰することができない合理的な事情がある場合は、前条の費用請求の対象から除外します。"),
    section("第9条（個別車両の確認）", "車両が確定したときは、車両情報、価格、支払条件、納車、保証その他の条件を記載した「個別車両購入確認書」により、改めて申込者の明確な承認を得ます。"),
    section("第10条（最終契約との関係）", "本契約および個別車両購入確認書は、別途必要となる最終売買契約書、割賦契約書、信販契約その他の契約を置き換えるものではありません。")
  ];
  return buildDocument(title, PURCHASE_INTENT_VERSION, sections, PURCHASE_INTENT_IMPORTANT_ITEMS);
}

export function buildVehicleConfirmationDocument(customer: EcontractCustomerSnapshot, terms: VehicleConfirmationTerms): EcontractDocumentSnapshot {
  const vehicleLabel = terms.vehicleType === "bike" ? "バイク" : "自動車";
  const title = "個別車両購入確認書";
  const chassis = terms.chassisNumberStatus === "confirmed"
    ? terms.chassisNumber
    : `${terms.chassisNumber || "未記載"}（現時点では未確定。判明後に最終契約書類等で確認します。）`;
  const sections = [
    section("第1条（当事者と目的）", `株式会社エコループ（以下「当社」といいます。）と、申込者 ${customer.name} 様（以下「申込者」といいます。）は、次の${vehicleLabel}および購入条件を確認し、購入手続を進めることを確認します。`),
    detailsSection("第2条（対象車両）", [
      ["車両区分", vehicleLabel], ["メーカー", terms.maker], ["車名", terms.model], ["グレード", terms.grade || "記載なし"],
      ["型式", terms.modelCode || "記載なし"], ["初度登録／年式", terms.firstRegistration], ["走行距離", `${formatNumber(terms.mileage)}km`], ["車台番号", chassis]
    ]),
    detailsSection("第3条（価格・支払条件）", [
      ["車両本体価格", formatYen(terms.vehiclePrice)], ["諸費用", formatYen(terms.fees)], ["支払総額", formatYen(terms.totalPrice)],
      ["頭金", formatYen(terms.downPayment)], ["下取充当額", formatYen(terms.tradeInAmount)], ["ローン等申込額", formatYen(terms.financedAmount)], ["支払回数", `${terms.installmentCount}回`],
      ["第1回支払額", formatYen(terms.firstPaymentAmount)], ["2回目以降支払額", formatYen(terms.monthlyPayment)], ["ボーナス払い", terms.bonusPayment || "なし"]
    ]),
    detailsSection("第4条（納車・保証等）", [
      ["納車方法", terms.deliveryMethod], ["納車予定", terms.deliveryEstimate], ["保証内容", terms.warranty || "別途案内のとおり"],
      ["オークション仕入れ", terms.auctionPurchase ? "該当" : "非該当"], ["特記事項", terms.specialTerms || "なし"]
    ]),
    section("第5条（購入承認）", "申込者は、上記車両および条件を確認し、「この車両・この条件で購入手続を進めてください」と明確に承認します。申込者の承認後、当社は落札、仕入、陸送、登録準備その他の手続へ進むことができます。"),
    section("第6条（承認後のキャンセル）", "申込者の承認に基づき当社が仕入その他の手続へ進んだ後、申込者都合でキャンセルする場合、当社は実際に発生した費用および損害を請求することがあります。ただし、消費者契約法その他の強行法規に従い、法令上認められる範囲を上限とし、同一損害を重ねて請求しません。"),
    section("第7条（最終契約との関係）", "本確認書は、別途必要となる最終売買契約書、割賦契約書、信販契約その他の契約を置き換えるものではありません。各契約書類の内容に相違がある場合は、法令および各契約の性質に従って確認します。")
  ];
  return buildDocument(title, VEHICLE_CONFIRMATION_VERSION, sections, VEHICLE_CONFIRMATION_IMPORTANT_ITEMS);
}

function buildDocument(title: string, version: string, sections: Section[], importantItems: EcontractImportantItem[]): EcontractDocumentSnapshot {
  const html = [
    `<article class="econtract-document">`,
    `<h1>${escapeHtml(title)}</h1>`,
    `<p class="econtract-company">株式会社エコループ</p>`,
    ...sections.map((item) => `<section><h2>${escapeHtml(item.heading)}</h2>${item.html}</section>`),
    `</article>`
  ].join("");
  const text = [title, "株式会社エコループ", ...sections.flatMap((item) => [item.heading, item.text])].join("\n\n");
  return { title, version, html, text, importantItems };
}

type Section = { heading: string; html: string; text: string };

function section(heading: string, body: string): Section {
  return { heading, html: `<p>${escapeHtml(body)}</p>`, text: body };
}

function detailsSection(heading: string, rows: Array<[string, string]>): Section {
  const html = `<dl>${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
  const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  return { heading, html, text };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character] ?? character);
}

function formatYen(value: number) {
  return `${formatNumber(value)}円`;
}

function formatNumber(value: number) {
  return Number(value).toLocaleString("ja-JP");
}
