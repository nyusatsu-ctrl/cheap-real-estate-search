import Image from "next/image";

type EcoloopAdminBrandProps = {
  showSystemName?: boolean;
  systemName?: string;
  logoSrc?: string;
  logoAlt?: string;
  logoWidth?: number;
  logoHeight?: number;
  className?: string;
  logoClassName?: string;
  textClassName?: string;
  priority?: boolean;
};

export function EcoloopAdminBrand({
  showSystemName = true,
  systemName = "契約管理システム",
  logoSrc = "/brand/ecoloop-logo.png",
  logoAlt = "株式会社エコループ ロゴ",
  logoWidth = 134,
  logoHeight = 80,
  className = "",
  logoClassName = "h-9",
  textClassName = "text-sm sm:text-base",
  priority = false
}: EcoloopAdminBrandProps) {
  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <Image
        src={logoSrc}
        alt={logoAlt}
        width={logoWidth}
        height={logoHeight}
        priority={priority}
        className={`w-auto shrink-0 object-contain ${logoClassName}`}
      />
      <div className={`min-w-0 ${textClassName}`}>
        <div className="flex flex-wrap items-baseline gap-x-1 leading-tight">
          <span className="font-black text-slate-950">株式会社エコループ</span>
          {showSystemName ? (
            <>
              <span className="font-bold text-slate-400" aria-hidden="true">｜</span>
              <span className="font-bold text-slate-700">{systemName}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
