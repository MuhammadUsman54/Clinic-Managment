import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin } from "lucide-react";

export type AddressPick = { address: string; latitude: number; longitude: number; name?: string };

export default function AddressSearch({ value, onChange }: { value: AddressPick | null; onChange: (a: AddressPick) => void }) {
  const [q, setQ] = useState(value?.address ?? "");
  const [results, setResults] = useState<AddressPick[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const t = useRef<number | null>(null);

  useEffect(() => {
    if (t.current) window.clearTimeout(t.current);
    if (!q || q.length < 3) { setResults([]); return; }
    t.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("foursquare-search", {
          method: "GET" as any,
        });
        // fallback: use direct fetch with query param since invoke doesn't pass query strings
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/foursquare-search?q=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        });
        const json = await res.json();
        setResults(json.results || []);
        setOpen(true);
        void data; void error;
      } finally { setLoading(false); }
    }, 300);
  }, [q]);

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted-foreground"/>
        <Input className="pl-9" placeholder="Search address (Foursquare)" value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)} />
        {loading && <Loader2 className="w-4 h-4 absolute right-3 top-3 animate-spin text-muted-foreground"/>}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-lg shadow-soft max-h-72 overflow-auto">
          {results.map((r, i) => (
            <button type="button" key={i}
              onClick={() => { onChange(r); setQ(r.address); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-muted text-sm">
              <div className="font-medium">{r.name}</div>
              <div className="text-muted-foreground text-xs">{r.address}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}