export function LogoMark() {
  return (
    <div className="relative w-8 h-8 rounded-lg border border-[rgba(255,255,255,0.08)]"
         style={{ background: "linear-gradient(155deg, #1e1e22 0%, #131316 100%)" }}>
      <div className="absolute inset-[6px_9px] border-[1.5px] border-[#fafafa] rounded-full"
           style={{ borderRightColor: "transparent", transform: "rotate(-30deg)" }} />
      <div className="absolute top-[15px] left-[9px] w-[14px] h-[1.5px] bg-[#fafafa] rounded-sm"
           style={{ transform: "rotate(45deg)" }} />
    </div>
  );
}
