import { useState, useEffect } from 'react';
import { SearchForm } from './components/SearchForm';
import { ProgressTracker } from './components/ProgressTracker';
import { DataTable } from './components/DataTable';
import { GoogleMapsScraper } from './services/scraper';
import { Listing, supabase } from './lib/supabase';
import { exportToCSV, exportToExcel } from './utils/exportUtils';
import { MapPin } from 'lucide-react';

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

  const handleStartScraping = async (businessType: string, location: string) => {
    setListings([]);
    setProcessedListings([]);
    setIsScrapingActive(true);
    setIsPaused(false);
    setShowProcessed(false);

    try {
      const sessionId = await scraper.startSession(businessType, location);
      setCurrentSessionId(sessionId);

      scraper.scrapeListings(businessType, location, (newListing) => {
        setListings((prev) => [...prev, newListing]);
      }).then(() => {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <MapPin className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Google Maps Scraper</h1>
              <p className="text-sm text-gray-600 mt-1">Sales Intelligence Tool</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <div className="mb-4 bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <button
                  onClick={() => setShowProcessed(false)}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    !showProcessed
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Raw Data ({listings.length})
                </button>
                <button
                  onClick={() => setShowProcessed(true)}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    showProcessed
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Processed Data ({processedListings.length})
                </button>
              </div>
              {showProcessed && processedListings.length > 0 && (
                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-green-600">✓ Verified</span> •
                  <span className="font-semibold text-blue-600">Deduplicated</span> •
                  <span>{processedListings.length} unique companies</span>
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
      </main>
    </div>
  );
}

export default App;
