import { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchFormProps {
  onStartScraping: (businessType: string, location: string) => void;
  isScrapingActive: boolean;
}

export function SearchForm({ onStartScraping, isScrapingActive }: SearchFormProps) {
  const [businessType, setBusinessType] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (businessType.trim() && city.trim() && country.trim()) {
      const location = `${city}, ${country}`;
      onStartScraping(businessType, location);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-2xl p-6 border border-slate-700/50">
      <h2 className="text-2xl font-bold text-white mb-6">Search Parameters</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="businessType" className="block text-sm font-medium text-slate-300 mb-2">
            Business Type
          </label>
          <input
            type="text"
            id="businessType"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            placeholder="e.g., restaurants, hotels, gyms"
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
            disabled={isScrapingActive}
            required
          />
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-slate-300 mb-2">
            City
          </label>
          <input
            type="text"
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g., New York"
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
            disabled={isScrapingActive}
            required
          />
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-medium text-slate-300 mb-2">
            Country
          </label>
          <input
            type="text"
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g., USA"
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
            disabled={isScrapingActive}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isScrapingActive}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 disabled:shadow-none"
        >
          <Search size={20} />
          Start Scraping
        </button>
      </form>
    </div>
  );
}
