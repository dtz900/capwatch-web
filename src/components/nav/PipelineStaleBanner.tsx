import { fetchPipelineStatus } from "@/lib/api";

export async function PipelineStaleBanner() {
  const status = await fetchPipelineStatus();
  if (!status || !status.is_stale || !status.message) return null;

  return (
    <div
      role="status"
      className="bg-[rgba(245,197,74,0.10)] border-b border-[rgba(245,197,74,0.35)] text-[#f5c54a] text-[12px] sm:text-[13px] font-medium"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-7 py-2 text-center">
        {status.message}
      </div>
    </div>
  );
}
