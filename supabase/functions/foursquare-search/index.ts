const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    if (!q || q.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const key = Deno.env.get('FOURSQUARE_API_KEY');
    if (!key) throw new Error('FOURSQUARE_API_KEY not configured');

    const fsq = await fetch(
      `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(q)}&limit=8`,
      { headers: { Authorization: key, Accept: 'application/json' } },
    );
    if (!fsq.ok) {
      const text = await fsq.text();
      throw new Error(`Foursquare ${fsq.status}: ${text}`);
    }
    const data = await fsq.json();
    const results = (data.results || []).map((r: any) => ({
      name: r.name,
      address: [r.location?.address, r.location?.locality, r.location?.region, r.location?.country]
        .filter(Boolean).join(', '),
      latitude: r.geocodes?.main?.latitude,
      longitude: r.geocodes?.main?.longitude,
    })).filter((r: any) => r.latitude && r.longitude);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});