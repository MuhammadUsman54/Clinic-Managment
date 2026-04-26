const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET') return json({ results: [], error: 'Method not allowed' }, 405);

  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    if (!q || q.length < 2) {
      return json({ results: [] });
    }
    const key = Deno.env.get('FOURSQUARE_API_KEY');
    if (!key) return json({ results: [], error: 'Address search is not configured' });

    const fsq = await fetch(
      `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(q)}&limit=8`,
      { headers: { Authorization: key, Accept: 'application/json' } },
    );
    if (!fsq.ok) {
      await fsq.text().catch(() => '');
      return json({
        results: [],
        error: fsq.status === 401 || fsq.status === 403
          ? 'Address search credentials are invalid'
          : 'Address search is temporarily unavailable',
      });
    }
    const data = await fsq.json();
    const results = (data.results || []).map((r: any) => ({
      name: r.name,
      address: [r.location?.address, r.location?.locality, r.location?.region, r.location?.country]
        .filter(Boolean).join(', '),
      latitude: r.geocodes?.main?.latitude,
      longitude: r.geocodes?.main?.longitude,
    })).filter((r: any) => r.latitude && r.longitude);

    return json({ results });
  } catch (e) {
    console.error('foursquare-search failed', e);
    return json({ results: [], error: 'Address search is temporarily unavailable' });
  }
});