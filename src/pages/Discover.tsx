import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Search, Building2, MapPin, Clock } from "lucide-react";

type Company = { id: string; name: string; address: string; timings: string | null; since: number | null };

export default function Discover() {
  const { user, loading, profile } = useAuth();
  const [q, setQ] = useState("");
  const [list, setList] = useState<Company[]>([]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      let query = supabase.from("companies").select("id,name,address,timings,since").order("created_at", { ascending: false }).limit(50);
      if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
      const { data } = await query;
      if (active) setList((data as Company[]) ?? []);
    };
    const t = setTimeout(run, 200);
    return () => { active = false; clearTimeout(t); };
  }, [q]);

  if (loading) return null;
  if (!user) return <Navigate to="/" replace/>;
  if (profile && profile.role !== "user") return <Navigate to="/companies" replace/>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle="Find tokens"/>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">Find a company</h1>
        <p className="text-muted-foreground mb-6">Search for businesses and grab a token.</p>
        <div className="relative mb-6">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground"/>
          <Input className="pl-9" placeholder="Search by company name…" value={q} onChange={(e)=>setQ(e.target.value)}/>
        </div>
        {list.length === 0 ? (
          <div className="text-muted-foreground text-center py-16 border-2 border-dashed rounded-2xl">
            No companies found.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {list.map((c) => (
              <Link to={`/discover/${c.id}`} key={c.id} className="group rounded-2xl border bg-card p-5 shadow-card hover:shadow-soft hover:-translate-y-0.5 transition-all">
                <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mb-3 text-primary-foreground"><Building2 className="w-6 h-6"/></div>
                <h3 className="font-bold text-lg">{c.name}</h3>
                {c.since && <p className="text-xs text-muted-foreground">Since {c.since}</p>}
                <p className="text-sm text-muted-foreground mt-2 flex items-start gap-1"><MapPin className="w-3.5 h-3.5 mt-0.5"/>{c.address}</p>
                {c.timings && <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5"/>{c.timings}</p>}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}