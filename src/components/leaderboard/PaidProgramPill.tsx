import { Tooltip } from "@/components/common/Tooltip";

export function PaidProgramPill() {
  return (
    <Tooltip content="This capper offers paid picks. TailSlips only tracks their public posts.">
      <span
        aria-label="Offers paid picks"
        className="inline-flex items-center justify-center text-[14px] font-black leading-none cursor-help select-none"
        style={{
          color: "#c084fc",
          filter:
            "drop-shadow(0 0 4px rgba(192,132,252,0.7)) drop-shadow(0 0 1px rgba(192,132,252,0.9))",
        }}
      >
        $
      </span>
    </Tooltip>
  );
}
