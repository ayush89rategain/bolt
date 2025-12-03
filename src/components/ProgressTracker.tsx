import { useEffect, useState } from 'react';
import { Clock, Database, Pause, Play, Square } from 'lucide-react';

interface ProgressTrackerProps {
  isScrapingActive: boolean;
  isPaused: boolean;
  recordsScraped: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function ProgressTracker({
  isScrapingActive,
  isPaused,
  recordsScraped,
  onPause,
  onResume,
  onStop,
}: ProgressTrackerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isScrapingActive && !isPaused) {
      if (!startTime) {
        setStartTime(Date.now() - elapsedTime * 1000);
      }
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - (startTime || Date.now())) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isScrapingActive, isPaused, startTime, elapsedTime]);

  useEffect(() => {
    if (!isScrapingActive) {
      setElapsedTime(0);
      setStartTime(null);
    }
  }, [isScrapingActive]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isScrapingActive) return null;

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-2xl p-6 border border-slate-700/50">
      <h2 className="text-2xl font-bold text-white mb-6">Scraping Progress</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Clock size={20} />
            <span className="text-sm font-medium">Time Elapsed</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatTime(elapsedTime)}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-green-600/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <Database size={20} />
            <span className="text-sm font-medium">Records Scraped</span>
          </div>
          <p className="text-2xl font-bold text-white">{recordsScraped}</p>
        </div>
      </div>

      <div className="flex gap-3">
        {isPaused ? (
          <button
            onClick={onResume}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
          >
            <Play size={20} />
            Resume
          </button>
        ) : (
          <button
            onClick={onPause}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
          >
            <Pause size={20} />
            Pause
          </button>
        )}

        <button
          onClick={onStop}
          className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-500/25"
        >
          <Square size={20} />
          Stop
        </button>
      </div>

      {isPaused && (
        <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
          <p className="text-sm text-amber-300 font-medium">Scraping paused. Click Resume to continue.</p>
        </div>
      )}
    </div>
  );
}
