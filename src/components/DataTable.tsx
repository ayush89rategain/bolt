import { Download } from 'lucide-react';
import { Listing } from '../lib/supabase';

interface DataTableProps {
  listings: Listing[];
  onExportCSV: () => void;
  onExportExcel: () => void;
}

export function DataTable({ listings, onExportCSV, onExportExcel }: DataTableProps) {
  if (listings.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-2xl p-8 text-center border border-slate-700/50">
        <p className="text-slate-400">No data yet. Start scraping to see results.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden border border-slate-700/50">
      <div className="p-6 border-b border-slate-700/50 flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-white">Scraped Data</h2>
        <div className="flex gap-3">
          <button
            onClick={onExportCSV}
            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-emerald-500/25"
          >
            <Download size={18} />
            Export CSV
          </button>
          <button
            onClick={onExportExcel}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-cyan-500/25"
          >
            <Download size={18} />
            Export Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Address
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Website
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {listings.map((listing) => (
              <tr key={listing.id} className="hover:bg-slate-700/20 transition-colors duration-150">
                <td className="px-6 py-4 text-sm font-medium text-white max-w-xs">
                  <div className="line-clamp-2">{listing.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  {listing.type ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {listing.type}
                    </span>
                  ) : (
                    <span className="text-slate-500">N/A</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  {listing.rating ? (
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ⭐ {listing.rating}
                      </span>
                      {listing.reviews ? (
                        <span className="text-xs text-slate-500">{listing.reviews} reviews</span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-slate-500">N/A</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-300 max-w-xs truncate">
                  {listing.address || <span className="text-slate-500">N/A</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  {listing.phone || <span className="text-slate-500">N/A</span>}
                </td>
                <td className="px-6 py-4 text-sm text-slate-300 max-w-xs truncate">
                  {listing.website ? (
                    <a
                      href={listing.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                    >
                      {listing.website}
                    </a>
                  ) : (
                    <span className="text-slate-500">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 bg-slate-900/30 border-t border-slate-700/50">
        <p className="text-sm text-slate-400">
          Showing <span className="text-white font-semibold">{listings.length}</span> {listings.length === 1 ? 'result' : 'results'}
        </p>
      </div>
    </div>
  );
}
