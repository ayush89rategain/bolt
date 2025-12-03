import { supabase, Listing } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export class GoogleMapsScraper {
  private sessionId: string | null = null;
  private isRunning = false;
  private isPaused = false;
  private abortController: AbortController | null = null;

  async startSession(businessType: string, location: string): Promise<string> {
    const { data, error } = await supabase
      .from('scraping_sessions')
      .insert({
        business_type: businessType,
        location: location,
        status: 'running',
        total_records: 0,
        processing_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    this.sessionId = data.id;
    this.isRunning = true;
    this.isPaused = false;
    this.abortController = new AbortController();

    return data.id;
  }

  async scrapeListings(
    businessType: string,
    location: string,
    onProgress: (listing: Listing) => void
  ): Promise<void> {
    if (!this.sessionId) {
      throw new Error('Session not started');
    }

    try {
      const apiUrl = `${SUPABASE_URL}/functions/v1/scrape-google-maps`;
      const headers = {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ businessType, location }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch listings from SearchAPI');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to scrape listings');
      }

      const listings = result.listings || [];

      for (let i = 0; i < listings.length; i++) {
        if (this.abortController?.signal.aborted) {
          break;
        }

        while (this.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (this.abortController?.signal.aborted) {
            break;
          }
        }

        if (this.abortController?.signal.aborted) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 300));

        const listing = listings[i];
        const { data, error } = await supabase
          .from('listings')
          .insert({
            session_id: this.sessionId,
            name: listing.name,
            description: listing.description,
            rating: listing.rating,
            website: listing.website,
            raw_website: listing.website,
            address: listing.address,
            phone: listing.phone,
          })
          .select()
          .single();

        if (error) {
          console.error('Error inserting listing:', error);
          continue;
        }

        await supabase
          .from('scraping_sessions')
          .update({ total_records: i + 1 })
          .eq('id', this.sessionId);

        onProgress(data);
      }

      if (!this.abortController?.signal.aborted) {
        await this.completeSession();
        await this.processListings();
      }
    } catch (error) {
      console.error('Scraping error:', error);
      throw error;
    }
  }

  pause() {
    this.isPaused = true;
    if (this.sessionId) {
      supabase
        .from('scraping_sessions')
        .update({ status: 'paused' })
        .eq('id', this.sessionId);
    }
  }

  resume() {
    this.isPaused = false;
    if (this.sessionId) {
      supabase
        .from('scraping_sessions')
        .update({ status: 'running' })
        .eq('id', this.sessionId);
    }
  }

  stop() {
    this.abortController?.abort();
    this.isRunning = false;
    if (this.sessionId) {
      supabase
        .from('scraping_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', this.sessionId);
    }
  }

  private async completeSession() {
    if (this.sessionId) {
      await supabase
        .from('scraping_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', this.sessionId);
    }
    this.isRunning = false;
  }

  private async processListings() {
    if (!this.sessionId) return;

    try {
      const apiUrl = `${SUPABASE_URL}/functions/v1/process-listings`;
      const headers = {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId: this.sessionId }),
      });

      if (!response.ok) {
        console.error('Failed to process listings');
        return;
      }

      const result = await response.json();
      console.log('Processing complete:', result);
    } catch (error) {
      console.error('Error processing listings:', error);
    }
  }

  getIsPaused() {
    return this.isPaused;
  }

  getIsRunning() {
    return this.isRunning;
  }

}
