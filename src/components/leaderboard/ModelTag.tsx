import { Tooltip } from "@/components/common/Tooltip";

export function ModelTag() {
  return (
    <Tooltip content="API integrated. This capper's signals come from a connected model API.">
      <span
        aria-label="API integrated"
        className="inline-flex items-center gap-1.5 cursor-help select-none"
      >
        <span
          aria-hidden="true"
          className="w-[7px] h-[7px] rounded-full"
          style={{
            backgroundColor: "#60a5fa",
            animation: "pulse-blue 1.6s ease-out infinite",
          }}
        />
        <span
          className="text-[10px] font-extrabold uppercase leading-none tracking-[0.14em]"
          style={{ color: "#60a5fa" }}
        >
          API
        </span>
      </span>
    </Tooltip>
  );
}
