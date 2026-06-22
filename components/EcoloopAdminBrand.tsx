import Image from "next/image";

type EcoloopAdminBrandProps = {
  showSystemName?: boolean;
  className?: string;
  logoClassName?: string;
  textClassName?: string;
  priority?: boolean;
};

export function EcoloopAdminBrand({
  showSystemName = true,
  className = "",
  logoClassName = "h-9",
  textClassName = "text-sm sm:text-base",
  priority = false
}: EcoloopAdminBrandProps) {
  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <Image
        src="/brand/ecoloop-logo.png"
        alt="株式会社エコループ ロゴ"
        width={134}
        height={80}
        priority={priority}
        className={`w-auto shrink-0 object-contain ${logoClassName}`}
      />
      <div className={`min-w-0 ${textClassName}`}>
        <div className="flex flex-wrap items-baseline gap-x-1 leading-tight">
          <span className="font-black text-slate-950">株式会社エコループ</span>
          {showSystemName ? (
            <>
              <span className="font-bold text-slate-400" aria-hidden="true">｜</span>
              <span className="font-bold text-slate-700">契約管理システム</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
