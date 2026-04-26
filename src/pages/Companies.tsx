import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Plus, Building2, MapPin, Clock } from "lucide-react";
import AddCompanyModal from "@/components/AddCompanyModal";

type Company = { id: string; name: string; address: string; timings: string | null; since: number | null; certificate_urls: string[] };

export default function Companies() {
  const { user, loading, profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(true);

  const load = async () => {
    if (!user) return;
    setFetching(true);
    const { data } = await supabase.from("companies").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
    setCompanies((data as Company[]) ?? []);
    setFetching(false);
  };
  useEffect(() => { if (user) load(); }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/" replace/>;
  if (profile && profile.role !== "company") return <Navigate to="/discover" replace/>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle="My companies"/>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My companies</h1>
            <p className="text-muted-foreground">Manage your businesses and daily tokens.</p>
          </div>
          {companies.length > 0 && (
            <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2"/>Add company</Button>
          )}
        </div>

        {fetching ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : companies.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed p-16 text-center">
            <Building2 className="w-14 h-14 mx-auto text-muted-foreground mb-4"/>
            <h3 className="text-xl font-semibold mb-2">No companies yet</h3>
            <p className="text-muted-foreground mb-6">Click below to add your first company.</p>
            <Button size="lg" onClick={() => setOpen(true)} className="rounded-full w-16 h-16 p-0">
              <Plus className="w-7 h-7"/>
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((c) => (
              <Link to={`/companies/${c.id}`} key={c.id} className="group rounded-2xl border bg-card p-5 shadow-card hover:shadow-soft hover:-translate-y-0.5 transition-all">
                <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mb-3 text-primary-foreground"><Building2 className="w-6 h-6"/></div>
                <h3 className="font-bold text-lg">{c.name}</h3>
                {c.since && <p className="text-xs text-muted-foreground">Since {c.since}</p>}
                <p className="text-sm text-muted-foreground mt-2 flex items-start gap-1"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0"/>{c.address}</p>
                {c.timings && <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5"/>{c.timings}</p>}
              </Link>
            ))}
          </div>
        )}

        <AddCompanyModal open={open} onOpenChange={setOpen} onCreated={load}/>
      </main>
    </div>
  );
}