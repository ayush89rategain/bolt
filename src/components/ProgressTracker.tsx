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
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Scraping Progress</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Clock size={20} />
            <span className="text-sm font-medium">Time Elapsed</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatTime(elapsedTime)}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Database size={20} />
            <span className="text-sm font-medium">Records Scraped</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{recordsScraped}</p>
        </div>
      </div>

      <div className="flex gap-3">
        {isPaused ? (
          <button
            onClick={onResume}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            <Play size={20} />
            Resume
          </button>
        ) : (
          <button
            onClick={onPause}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            <Pause size={20} />
            Pause
          </button>
        )}

        <button
          onClick={onStop}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-2"
        >
          <Square size={20} />
          Stop
        </button>
      </div>

      {isPaused && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800 font-medium">Scraping paused. Click Resume to continue.</p>
        </div>
      )}
    </div>
  );
}
