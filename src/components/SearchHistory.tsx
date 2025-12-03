import { useEffect, useState } from 'react';
import { Clock, MapPin, Database, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CachedSearch {
  id: string;
  search_query: string;
  business_type: string;
  location: string;
  result_count: number;
  cached_at: string;
  session_id: string;
}

interface SearchHistoryProps {
  onUseSearch: (sessionId: string, businessType: string, location: string) => void;
}

export function SearchHistory({ onUseSearch }: SearchHistoryProps) {
  const [searches, setSearches] = useState<CachedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadSearchHistory();
    }
  }, [user]);

  const loadSearchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('search_cache')
        .select('*')
        .order('cached_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading search history:', error);
        return;
      }

      setSearches(data || []);
    } catch (error) {
      console.error('Failed to load search history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('search_cache')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSearches(searches.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete search:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-2xl p-6 border border-slate-700/50">
        <h2 className="text-2xl font-bold text-white mb-4">Recent Searches</h2>
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (searches.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-2xl p-6 border border-slate-700/50">
        <h2 className="text-2xl font-bold text-white mb-4">Recent Searches</h2>
        <p className="text-slate-400">No search history yet. Start a new search to see it here.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-2xl p-6 border border-slate-700/50">
      <h2 className="text-2xl font-bold text-white mb-4">Recent Searches</h2>
      <div className="space-y-3">
        {searches.map((search) => (
          <div
            key={search.id}
            className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-700/30 transition-all duration-200 group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={16} className="text-cyan-400 flex-shrink-0" />
                  <h3 className="text-white font-semibold truncate">
                    {search.business_type}
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Database size={14} />
                    {search.result_count} results
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {formatDate(search.cached_at)}
                  </span>
                  <span className="truncate">{search.location}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUseSearch(search.session_id, search.business_type, search.location)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/25"
                >
                  Use
                </button>
                <button
                  onClick={() => handleDelete(search.id)}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
