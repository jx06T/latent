import { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { gameSupabase } from '@/lib/supabase-game'
import type { Tables } from '@/lib/database.types'

interface LeaderboardEntry {
    teamId: string
    teamName: string
    solvedCount: number
    lastSolvedAt: string | null
}

export default function Leaderboard() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)

    const fetchData = useCallback(async () => {
        setIsSyncing(true)
        // 1. 獲取所有未停權的隊伍
        const { data: teams } = await gameSupabase
            .from('game_teams')
            .select('id, team_code, team_name')
            .eq('is_suspended', false)

        if (!teams) return

        // 2. 獲取所有解題進度 (RLS 允許所有人讀取此表)
        const { data: progress } = await gameSupabase
            .from('game_team_progress')
            .select('team_id, solved_at')

        if (!progress) return

        // 3. 處理統計數據
        const stats: Record<string, { count: number; lastSolved: string | null }> = {}

        teams.forEach(t => {
            stats[t.id] = { count: 0, lastSolved: null }
        })

        progress.forEach(p => {
            if (stats[p.team_id] && p.solved_at) {
                stats[p.team_id].count++
                // 紀錄該隊伍最後一次解題時間
                if (!stats[p.team_id].lastSolved || p.solved_at > stats[p.team_id].lastSolved!) {
                    stats[p.team_id].lastSolved = p.solved_at
                }
            }
        })

        // 4. 轉換為陣列並排序
        const result: LeaderboardEntry[] = teams.map(t => ({
            teamId: t.id,
            teamName: t.team_name || t.team_code,
            solvedCount: stats[t.id].count,
            lastSolvedAt: stats[t.id].lastSolved
        }))

        result.sort((a, b) => {
            if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount
            if (!a.lastSolvedAt) return 1
            if (!b.lastSolvedAt) return -1
            // 同分時，最後解題時間較早者排名較前
            return new Date(a.lastSolvedAt).getTime() - new Date(b.lastSolvedAt).getTime()
        })

        setEntries(result)
        setLoading(false)
        setIsSyncing(false)
    }, [])

    useEffect(() => {
        fetchData()

        // 訂閱實時變更：當任何隊伍解題成功（進度表新增資料）時，重新整理排行榜
        const channel = gameSupabase
            .channel('leaderboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'game_team_progress' }, fetchData)
            .subscribe()

        return () => { gameSupabase.removeChannel(channel) }
    }, [fetchData])

    if (loading) return <div className="text-xs text-ink-ddim font-mono animate-pulse uppercase">Syncing_Leaderboard...</div>

    return (
        <div className="space-y-3 font-mono">
            <div className="border-b border-line mb-3 pb-1">
                <h3 className=' text-ink-dim uppercase text-sm tracking-widest'>
                // GLOBAL_RANK
                </h3>
                <div className="flex items-center justify-between mt-2 pr-0.5">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
                        </span>
                        <span className="text-xs text-ink-muted tracking-tighter uppercase">Live_Sync</span>
                    </div>
                    <button
                        onClick={() => fetchData()}
                        disabled={isSyncing}
                        className={`text-ink-ddim hover:text-success transition-colors ${isSyncing ? 'animate-spin text-success' : ''}`}
                        title="Manual Resync"
                    >
                        <RefreshCw size={10} />
                    </button>
                </div>
            </div>

            {entries.slice(0, 10).map((entry, idx) => (
                <div key={entry.teamId} className={`flex items-center justify-between group`}>
                    <div className="flex items-center gap-3">
                        <span className={`font-bold text-xs ${idx < 3 ? 'text-accent-500 ' : 'text-ink-muted'}`}>
                            {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className={`text-xs truncate max-w-35 ${entry.solvedCount > 0 ? 'text-ink' : 'text-ink-muted/80'}`}>
                            {entry.teamName}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-px w-8 bg-ink/5 group-hover:w-12 transition-all" />
                        <span className={`font-bold text-xs tabular-nums ${entry.solvedCount > 0 ? 'text-ink-dim' : 'text-ink-ddim'}`}>
                            {entry.solvedCount}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    )
}