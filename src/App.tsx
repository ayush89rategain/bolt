import { useState, useEffect } from 'react';
import { SearchForm } from './components/SearchForm';
import { ProgressTracker } from './components/ProgressTracker';
import { DataTable } from './components/DataTable';
import { SearchHistory } from './components/SearchHistory';
import { AuthModal } from './components/AuthModal';
import { SearchLogs } from './components/SearchLogs';
import { GoogleMapsScraper } from './services/scraper';
import { Listing, supabase } from './lib/supabase';
import { exportToCSV, exportToExcel } from './utils/exportUtils';
import { MapPin, LogOut, LogIn, Shield } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';

interface ProcessedListing {
  id: string;
  name: string;
  rating: number;
  website: string;
  address: string;
  phone: string;
  is_website_verified: boolean;
  website_status_code: number;
}

function App() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [processedListings, setProcessedListings] = useState<ProcessedListing[]>([]);
  const [isScrapingActive, setIsScrapingActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showProcessed, setShowProcessed] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [scraper] = useState(() => new GoogleMapsScraper());
  const [cacheMessage, setCacheMessage] = useState<string>('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, signOut, loading } = useAuth();


  const handleStartScraping = async (businessType: string, location: string) => {
    if (!user) {
      return;
    }

    setListings([]);
    setProcessedListings([]);
    setCacheMessage('');
    setIsScrapingActive(true);
    setIsPaused(false);
    setShowProcessed(false);

    try {
      const cachedSessionId = await scraper.checkCache(businessType, location);

      if (cachedSessionId) {
        setCacheMessage('Using cached results from a previous search. No API credits used!');
        setCurrentSessionId(cachedSessionId);
        await loadSessionData(cachedSessionId);

        const { data: cachedData } = await supabase
          .from('listings')
          .select('id')
          .eq('session_id', cachedSessionId);

        await supabase.rpc('log_search', {
          p_user_id: user.id,
          p_user_email: user.email,
          p_session_id: cachedSessionId,
          p_business_type: businessType,
          p_location: location,
          p_result_count: cachedData?.length || 0,
          p_was_cached: true
        });

        setIsScrapingActive(false);
        return;
      }

      const sessionId = await scraper.startSession(businessType, location, user.id);
      setCurrentSessionId(sessionId);

      scraper.scrapeListings(businessType, location, (newListing) => {
        setListings((prev) => [...prev, newListing]);
      }).then(async () => {
        const { data: sessionData } = await supabase
          .from('scraping_sessions')
          .select('total_records')
          .eq('id', sessionId)
          .maybeSingle();

        await supabase.rpc('log_search', {
          p_user_id: user.id,
          p_user_email: user.email || '',
          p_session_id: sessionId,
          p_business_type: businessType,
          p_location: location,
          p_result_count: sessionData?.total_records || 0,
          p_was_cached: false
        });

        setIsScrapingActive(false);
      }).catch((error) => {
        console.error('Scraping error:', error);
        setIsScrapingActive(false);
      });
    } catch (error) {
      console.error('Failed to start session:', error);
      setIsScrapingActive(false);
    }
  };

  const loadSessionData = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading session data:', error);
      return;
    }

    setListings(data || []);
  };

  const handleUseSearch = async (sessionId: string, businessType: string, location: string) => {
    if (!user) return;

    setListings([]);
    setProcessedListings([]);
    setCurrentSessionId(sessionId);
    setCacheMessage('Loaded from search history. No API credits used!');
    await loadSessionData(sessionId);
    await loadProcessedListings();

    const { data: cachedData } = await supabase
      .from('listings')
      .select('id')
      .eq('session_id', sessionId);

    await supabase.rpc('log_search', {
      p_user_id: user.id,
      p_user_email: user.email || '',
      p_session_id: sessionId,
      p_business_type: businessType,
      p_location: location,
      p_result_count: cachedData?.length || 0,
      p_was_cached: true
    });
  };

  const handlePause = () => {
    scraper.pause();
    setIsPaused(true);
  };

  const handleResume = () => {
    scraper.resume();
    setIsPaused(false);
  };

  const handleStop = () => {
    scraper.stop();
    setIsScrapingActive(false);
    setIsPaused(false);
  };

  useEffect(() => {
    if (currentSessionId && !isScrapingActive) {
      const timer = setTimeout(() => {
        loadProcessedListings();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentSessionId, isScrapingActive]);

  const loadProcessedListings = async () => {
    if (!currentSessionId) return;

    try {
      const { data, error } = await supabase
        .from('processed_listings')
        .select('*')
        .eq('session_id', currentSessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading processed listings:', error);
        return;
      }

      setProcessedListings(data || []);
    } catch (error) {
      console.error('Failed to load processed listings:', error);
    }
  };

  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const dataToExport = showProcessed ? processedListings : listings;
    const filename = showProcessed
      ? `google-maps-processed-${timestamp}.csv`
      : `google-maps-raw-${timestamp}.csv`;
    exportToCSV(dataToExport, filename);
  };

  const handleExportExcel = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const dataToExport = showProcessed ? processedListings : listings;
    const filename = showProcessed
      ? `google-maps-processed-${timestamp}.xlsx`
      : `google-maps-raw-${timestamp}.xlsx`;
    exportToExcel(dataToExport, filename);
  };

  return (
    <>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <header className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl border-b border-slate-700/50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-3 rounded-xl shadow-lg shadow-cyan-500/20">
                <MapPin className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Google Maps Scraper</h1>
                <p className="text-sm text-slate-400 mt-1">Sales Intelligence Tool</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <Shield className="text-emerald-400" size={18} />
                    <div className="flex flex-col">
                      <span className="text-xs text-emerald-400 font-semibold">Verified</span>
                      <span className="text-xs text-slate-300">{user.email}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl transition-all duration-200"
                  >
                    <LogOut size={18} />
                    <span className="text-sm font-medium">Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/25"
                >
                  <LogIn size={20} />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!user && (
          <div className="mb-8 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/30 rounded-xl p-8 text-center">
            <Shield className="mx-auto text-cyan-400 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-white mb-2">Authentication Required</h2>
            <p className="text-slate-300 mb-4">
              Please sign in with your verified RateGain email address to access the scraper.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/25"
            >
              <LogIn size={20} />
              <span>Sign In with RateGain Email</span>
            </button>
          </div>
        )}

        {user && (
          <>
            <div className="mb-8">
              <SearchLogs />
            </div>

            <div className="mb-8">
              <SearchHistory onUseSearch={handleUseSearch} />
            </div>

            {cacheMessage && (
              <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-emerald-300 font-medium">{cacheMessage}</p>
              </div>
            )}
          </>
        )}
        {user && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-1">
                <SearchForm
                  onStartScraping={handleStartScraping}
                  isScrapingActive={isScrapingActive}
                />
              </div>

              <div className="lg:col-span-2">
                <ProgressTracker
                  isScrapingActive={isScrapingActive}
                  isPaused={isPaused}
                  recordsScraped={listings.length}
                  onPause={handlePause}
                  onResume={handleResume}
                  onStop={handleStop}
                />
              </div>
            </div>

            {(listings.length > 0 || processedListings.length > 0) && (
              <div className="mb-4 bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-2xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowProcessed(false)}
                      className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                        !showProcessed
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Raw Data ({listings.length})
                    </button>
                    <button
                      onClick={() => setShowProcessed(true)}
                      className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                        showProcessed
                          ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Processed Data ({processedListings.length})
                    </button>
                  </div>
                  {showProcessed && processedListings.length > 0 && (
                    <div className="text-sm text-slate-400">
                      <span className="font-semibold text-emerald-400">✓ Verified</span> •
                      <span className="font-semibold text-cyan-400"> Deduplicated</span> •
                      <span className="text-slate-300"> {processedListings.length} unique companies</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DataTable
              listings={showProcessed ? processedListings as any : listings}
              onExportCSV={handleExportCSV}
              onExportExcel={handleExportExcel}
            />
          </>
        )}
      </main>
    </div>
    </>
  );
}

export default App;
