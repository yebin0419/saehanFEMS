"use client";

interface Props {
  isLive: boolean;
  label?: string;
}

export function LiveIndicator({ isLive, label }: Props) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[11px]">
      <span className="relative inline-flex w-2.5 h-2.5">
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${
            isLive ? "bg-run animate-ping opacity-60" : "bg-slate-400"
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
            isLive ? "bg-run" : "bg-slate-400"
          }`}
        />
      </span>
      <span className={isLive ? "text-run font-medium" : "text-muted"}>
        {label ?? (isLive ? "LIVE" : "OFFLINE")}
      </span>
    </div>
  );
}
