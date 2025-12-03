import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ScrapeRequest {
  businessType: string;
  location: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { businessType, location }: ScrapeRequest = await req.json();
    const searchApiKey = Deno.env.get("SEARCHAPI_KEY");

    if (!searchApiKey) {
      throw new Error("SearchAPI key not configured");
    }

    const query = `${businessType} in ${location}`;
    const searchApiUrl = `https://www.searchapi.io/api/v1/search?engine=google_maps&q=${encodeURIComponent(query)}&api_key=${searchApiKey}`;

    const response = await fetch(searchApiUrl);
    
    if (!response.ok) {
      throw new Error(`SearchAPI request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const localResults = data.local_results || [];

    const listings = localResults.map((result: any) => ({
      name: result.title || result.name || "Unknown",
      description: result.description || "",
      rating: result.rating || 0,
      reviews: result.reviews || 0,
      type: result.type || "",
      website: result.website || "",
      address: result.address || "",
      phone: result.phone || "",
      latitude: result.gps_coordinates?.latitude || null,
      longitude: result.gps_coordinates?.longitude || null,
      opening_hours: result.opening_hours || null,
      price_level: result.price || "",
      thumbnail: result.thumbnail || "",
      place_id: result.place_id || "",
    }));

    return new Response(
      JSON.stringify({ success: true, listings }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Scraping error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to scrape listings"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});