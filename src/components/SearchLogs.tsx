import { useEffect, useState } from 'react';
import { Activity, Search, Database, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SearchLog {
  id: string;
  business_type: string;
  location: string;
  result_count: number;
  was_cached: boolean;
  search_date: string;
}

interface UserStats {
  total_searches: number;
  new_searches: number;
  cached_searches: number;
  total_records_extracted: number;
  last_search_date: string;
  first_search_date: string;
}

export function SearchLogs() {
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [logsResult, statsResult] = await Promise.all([
        supabase
          .from('search_logs')
          .select('*')
          .order('search_date', { ascending: false })
          .limit(20),
        supabase
          .from('user_search_stats')
          .select('*')
          .maybeSingle()
      ]);

      if (logsResult.data) {
        setLogs(logsResult.data);
      }

      if (statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error('Failed to load search logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-2xl p-6 border border-slate-700/50">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="text-cyan-400" size={28} />
          Search Activity Log
        </h2>
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Search className="text-cyan-400" size={24} />
              <TrendingUp className="text-cyan-400" size={20} />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.total_searches}</div>
            <div className="text-sm text-slate-400">Total Searches</div>
            <div className="mt-2 text-xs text-slate-500">
              {stats.new_searches} new • {stats.cached_searches} cached
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/10 to-green-600/10 border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Database className="text-emerald-400" size={24} />
              <TrendingUp className="text-emerald-400" size={20} />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.total_records_extracted.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Records Extracted</div>
            <div className="mt-2 text-xs text-slate-500">
              Avg: {Math.round(stats.total_records_extracted / stats.total_searches)} per search
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="text-amber-400" size={24} />
              <Calendar className="text-amber-400" size={20} />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.new_searches}</div>
            <div className="text-sm text-slate-400">API Calls Made</div>
            <div className="mt-2 text-xs text-slate-500">
              Credits used
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Database className="text-purple-400" size={24} />
              <TrendingUp className="text-purple-400" size={20} />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.cached_searches}</div>
            <div className="text-sm text-slate-400">Cached Results</div>
            <div className="mt-2 text-xs text-slate-500">
              Credits saved
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-2xl p-6 border border-slate-700/50">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="text-cyan-400" size={28} />
          Recent Search Activity
        </h2>

        {logs.length === 0 ? (
          <p className="text-slate-400">No search activity yet. Start a search to see it logged here.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-700/30 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Search size={16} className="text-cyan-400 flex-shrink-0" />
                      <h3 className="text-white font-semibold truncate">
                        {log.business_type}
                      </h3>
                      {log.was_cached && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Cached
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                      <span className="truncate">{log.location}</span>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <Database size={14} />
                        {log.result_count} results
                      </span>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <Calendar size={14} />
                        {formatDate(log.search_date)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
