import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessRequest {
  sessionId: string;
}

interface Listing {
  id: string;
  name: string;
  rating: number;
  website: string;
  address: string;
  phone: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { sessionId }: ProcessRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: listings, error: fetchError } = await supabase
      .from("listings")
      .select("*")
      .eq("session_id", sessionId);

    if (fetchError) throw fetchError;
    if (!listings || listings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No listings to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const processedListings: any[] = [];
    const seenCompanies = new Map<string, boolean>();

    for (const listing of listings) {
      const normalizedName = listing.name.toLowerCase().trim();
      const normalizedAddress = (listing.address || "").toLowerCase().trim();
      const companyKey = `${normalizedName}|${normalizedAddress}`;

      const isDuplicate = seenCompanies.has(companyKey);
      if (!isDuplicate) {
        seenCompanies.set(companyKey, true);
      }

      let isWebsiteVerified = false;
      let websiteStatusCode = 0;
      let verifiedWebsite = listing.website;

      if (listing.website && !isDuplicate) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const websiteUrl = listing.website.startsWith("http") 
            ? listing.website 
            : `https://${listing.website}`;

          const response = await fetch(websiteUrl, {
            method: "HEAD",
            signal: controller.signal,
            redirect: "follow",
          });

          clearTimeout(timeoutId);
          websiteStatusCode = response.status;
          isWebsiteVerified = response.status >= 200 && response.status < 400;
        } catch (error) {
          console.log(`Website verification failed for ${listing.website}:`, error.message);
          isWebsiteVerified = false;
        }
      }

      if (!isDuplicate && isWebsiteVerified) {
        processedListings.push({
          session_id: sessionId,
          name: listing.name,
          rating: listing.rating,
          website: verifiedWebsite,
          address: listing.address,
          phone: listing.phone,
          is_website_verified: isWebsiteVerified,
          website_status_code: websiteStatusCode,
          is_duplicate: false,
        });
      }
    }

    if (processedListings.length > 0) {
      const { error: insertError } = await supabase
        .from("processed_listings")
        .insert(processedListings);

      if (insertError) throw insertError;
    }

    await supabase
      .from("scraping_sessions")
      .update({ processing_status: "completed" })
      .eq("id", sessionId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedListings.length,
        total: listings.length,
        duplicatesRemoved: listings.length - processedListings.length
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Processing error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to process listings"
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