import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TelemetryDashboard() {
  const [totalProjects, setTotalProjects] = useState<number>(0);
  const [totalVotes, setTotalVotes] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchTelemetry() {
      try {
        const { count } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("status", "published");

        const { data: voteData } = await supabase
          .from("projects")
          .select("like_count")
          .eq("status", "published");

        // 計算實際總票數 (如果為 0 可考慮像原先一樣 fallback 到 150)
        const calculatedVotes = voteData?.reduce((acc, curr) => acc + (curr.like_count || 0), 0) || 0;

        setTotalProjects(count ?? 0);
        setTotalVotes(calculatedVotes > 0 ? calculatedVotes : 150);
      } catch (error) {
        console.error("Failed to fetch telemetry data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTelemetry();
  }, []);

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 border-b border-line">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-center">
        <div className="p-6 border border-line bg-ink-dim/5 rounded-lg">
          <h3 className="text-sm font-mono text-ink-dim mb-2">// TOTAL_PROJECTS</h3>
          <div className="text-4xl sm:text-5xl font-black text-ink text-glow-primary">
            {loading ? "..." : totalProjects}
          </div>
        </div>
        <div className="p-6 border border-line bg-ink-dim/5 rounded-lg">
          <h3 className="text-sm font-mono text-ink-dim mb-2">// TOTAL_VOTES</h3>
          <div className="text-4xl sm:text-5xl font-black text-accent-500">
            {loading ? "..." : totalVotes}
          </div>
        </div>
      </div>
    </section>
  );
}