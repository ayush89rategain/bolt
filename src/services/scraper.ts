import { supabase, Listing } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export class GoogleMapsScraper {
  private sessionId: string | null = null;
  private isRunning = false;
  private isPaused = false;
  private abortController: AbortController | null = null;
  private userId: string | null = null;

  async checkCache(businessType: string, location: string): Promise<string | null> {
    const searchQuery = `${businessType.toLowerCase().trim()}|${location.toLowerCase().trim()}`;

    const { data, error } = await supabase
      .from('search_cache')
      .select('*')
      .eq('search_query', searchQuery)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error('Error checking cache:', error);
      return null;
    }

    if (data) {
      return data.session_id;
    }

    return null;
  }

  async startSession(businessType: string, location: string, userId: string): Promise<string> {
    this.userId = userId;
    const searchQuery = `${businessType.toLowerCase().trim()}|${location.toLowerCase().trim()}`;

    const { data, error } = await supabase
      .from('scraping_sessions')
      .insert({
        user_id: userId,
        business_type: businessType,
        location: location,
        search_query: searchQuery,
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
            reviews: listing.reviews,
            type: listing.type,
            website: listing.website,
            raw_website: listing.website,
            address: listing.address,
            phone: listing.phone,
            latitude: listing.latitude,
            longitude: listing.longitude,
            opening_hours: listing.opening_hours,
            price_level: listing.price_level,
            thumbnail: listing.thumbnail,
            place_id: listing.place_id,
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
    if (this.sessionId && this.userId) {
      await supabase
        .from('scraping_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', this.sessionId);

      const { data: session } = await supabase
        .from('scraping_sessions')
        .select('business_type, location, search_query, total_records')
        .eq('id', this.sessionId)
        .maybeSingle();

      if (session) {
        await supabase
          .from('search_cache')
          .insert({
            user_id: this.userId,
            search_query: session.search_query,
            business_type: session.business_type,
            location: session.location,
            session_id: this.sessionId,
            result_count: session.total_records,
          });
      }
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
