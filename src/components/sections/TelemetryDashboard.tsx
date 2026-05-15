import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ScrambleText from "@/components/ui/ScrambleText";
import CommentLabel from "../ui/CommentLabel";

const STATS_CONFIG = [
  { id: "stat-projects", label: "TOTAL_PROJECTS", unit: "件", desc: "已發佈專題" },
  { id: "stat-votes", label: "ENERGY_VOTES", unit: "票", desc: "累積投票人次" },
  { id: "stat-views", label: "TOTAL_VIEWS", unit: "+", desc: "累積瀏覽次數" },
] as const;

export default function TelemetryDashboard() {
  const [totalProjects, setTotalProjects] = useState<number>(0);
  const [totalVotes, setTotalVotes] = useState<number>(0);
  const [totalViews, setTotalViews] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchTelemetry() {
      try {
        const [{ count }, { data: voteData }, statsRes] = await Promise.all([
          supabase
            .from("projects")
            .select("*", { count: "exact", head: true })
            .eq("status", "published"),
          supabase
            .from("projects")
            .select("like_count")
            .eq("status", "published"),
          fetch("/api/stats.json"),
        ]);

        const calculatedVotes = voteData?.reduce((acc, curr) => acc + (curr.like_count || 0), 0) || 0;

        setTotalProjects(count ?? 0);
        setTotalVotes(calculatedVotes > 0 ? calculatedVotes : 21);

        if (statsRes.ok) {
          const stats = await statsRes.json();
          setTotalViews(stats.total_views ?? 0);
        }
      } catch (error) {
        console.error("Failed to fetch telemetry data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTelemetry();
  }, []);

  const values = [totalProjects, totalVotes, totalViews];

  return (
    <section id="telemetry" className="relative py-20 overflow-hidden bg-bg-surface border-t border-line">
      <div className="relative z-10 max-w-6xl mx-auto px-[10%]">
        <div className="text-center mb-6 md:mb-12">
          <p className=" font-mono text-base uppercase text-ink-dim/90 mb-2 tracking-tighter">
            <CommentLabel text="system_telemetry" />
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-ink mt-2 tracking-widest font-mono">
            <ScrambleText text="[ STATUS ]" />
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-line">
          {STATS_CONFIG.map((stat, i) => (
            <div
              key={stat.id}
              className={`relative p-6 sm:p-8 md:p-10 text-center${i < 2 ? " border-b sm:border-b-0 sm:border-r border-line" : ""}`}
            >
              <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent-500" aria-hidden="true" />
              <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent-500" aria-hidden="true" />

              <div id={stat.id} className="text-5xl sm:text-6xl font-black text-accent-500 tabular-nums font-mono">
                {loading ? "..." : values[i]}
              </div>
              <div className="font-mono text-base text-ink-dim mt-2">{stat.unit}</div>
              <div className="font-mono text-sm text-ink-dim mt-3 tracking-widest uppercase">
                <div className="text-sm text-accent-600 mt-0.5">{stat.desc}</div>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}