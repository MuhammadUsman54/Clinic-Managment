import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import MapView from "@/components/MapView";
import { today } from "@/lib/today";
import { Check, Clock, Ticket as TicketIcon, MapPin, Loader2 } from "lucide-react";

type Company = { id: string; name: string; address: string; latitude: number | null; longitude: number | null; timings: string | null; certificate_urls: string[]; owner_id: string };
type TokensDay = { id: string; total_tokens: number; current_token: number; estimated_minutes_per_token: number; is_allowed: boolean };
type Purchase = { id: string; user_id: string; token_number: number; patient_image_url: string | null; status: string; profile?: { full_name: string | null; email: string | null; avatar_url: string | null } };

export default function CompanyManage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [td, setTd] = useState<TokensDay | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [total, setTotal] = useState("");
  const [eta, setEta] = useState("10");
  const [busy, setBusy] = useState(false);

  const loadAll = async () => {
    if (!id) return;
    const { data: c } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
    setCompany(c as Company | null);
    const { data: t } = await supabase.from("tokens_day").select("*").eq("company_id", id).eq("day", today()).maybeSingle();
    setTd(t as TokensDay | null);
    if (t) {
      setEta(String((t as any).estimated_minutes_per_token));
      const { data: p } = await supabase.from("token_purchases").select("*").eq("tokens_day_id", (t as any).id).order("token_number");
      const list = (p as any[]) ?? [];
      const userIds = [...new Set(list.map((x) => x.user_id))];
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("id,full_name,email,avatar_url").in("id", userIds)
        : { data: [] as any[] };
      const byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      setPurchases(list.map((x) => ({ ...x, profile: byId[x.user_id] })));
    } else {
      setPurchases([]);
    }
  };

  useEffect(() => { loadAll(); }, [id]);

  // Realtime updates for purchases
  useEffect(() => {
    if (!td) return;
    const ch = supabase.channel(`td-${td.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "token_purchases", filter: `tokens_day_id=eq.${td.id}` }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "tokens_day", filter: `id=eq.${td.id}` }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [td?.id]);

  if (loading) return null;
  if (!user) return <Navigate to="/" replace/>;
  if (company && company.owner_id !== user.id) return <Navigate to="/companies" replace/>;

  const startToday = async () => {
    const n = parseInt(total, 10);
    if (!n || n < 1) { toast.error("Enter a valid total"); return; }
    setBusy(true);
    const { error } = await supabase.from("tokens_day").insert({
      company_id: id, day: today(), total_tokens: n,
      estimated_minutes_per_token: parseInt(eta, 10) || 10,
    });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Today's tokens are live"); loadAll(); }
  };

  const update = async (patch: Partial<TokensDay>) => {
    if (!td) return;
    const { error } = await supabase.from("tokens_day").update(patch).eq("id", td.id);
    if (error) toast.error(error.message); else loadAll();
  };

  const advance = async () => {
    if (!td) return;
    if (td.current_token >= td.total_tokens) { toast.info("All tokens served"); return; }
    await update({ current_token: td.current_token + 1 });
    toast.success(`Now serving #${td.current_token + 1}`);
  };

  if (!company) return <div className="min-h-screen"><AppHeader/><div className="p-8 text-muted-foreground">Loading…</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle={company.name}/>
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <section className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-start gap-1"><MapPin className="w-4 h-4 mt-0.5"/>{company.address}</p>
            {company.timings && <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-4 h-4"/>{company.timings}</p>}
            {company.certificate_urls.length > 0 && (
              <div className="flex gap-2 mt-4">
                {company.certificate_urls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer">
                    <img src={u} alt={`Certificate ${i+1}`} className="w-16 h-16 object-cover rounded-lg border"/>
                  </a>
                ))}
              </div>
            )}
          </div>
          {company.latitude && company.longitude ? (
            <MapView lat={company.latitude} lng={company.longitude} label={company.name}/>
          ) : <div className="rounded-2xl border bg-muted/30 flex items-center justify-center text-muted-foreground">No location</div>}
        </section>

        {!td ? (
          <section className="rounded-2xl border bg-card p-6 shadow-card">
            <h2 className="text-xl font-bold mb-1">Set up today's tokens</h2>
            <p className="text-sm text-muted-foreground mb-4">Tokens reset every day automatically.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Total tokens *</Label><Input type="number" value={total} onChange={(e)=>setTotal(e.target.value)} placeholder="e.g. 50"/></div>
              <div><Label>Estimated minutes per token *</Label><Input type="number" value={eta} onChange={(e)=>setEta(e.target.value)}/></div>
            </div>
            <Button className="mt-4" onClick={startToday} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2"/>}Start today
            </Button>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-bold">Today's queue</h2>
                  <p className="text-sm text-muted-foreground">Tap done after serving each token.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Allow tokens today</Label>
                  <Switch checked={td.is_allowed} onCheckedChange={(v) => update({ is_allowed: v })}/>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <Stat label="Total" value={td.total_tokens}/>
                <Stat label="Current" value={td.current_token} accent/>
                <Stat label="Remaining" value={Math.max(td.total_tokens - td.current_token, 0)}/>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mt-6">
                <div>
                  <Label>Estimated minutes per token</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={eta} onChange={(e)=>setEta(e.target.value)}/>
                    <Button variant="secondary" onClick={() => update({ estimated_minutes_per_token: parseInt(eta,10) || 10 })}>Save</Button>
                  </div>
                </div>
                <div className="flex items-end">
                  <Button onClick={advance} className="w-full" size="lg"><Check className="w-4 h-4 mr-2"/>Done — Next token</Button>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Tokens bought ({purchases.length})</h2>
              {purchases.length === 0 ? (
                <p className="text-muted-foreground text-sm">No tokens bought yet today.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {purchases.map((p) => {
                    const cancelled = p.status === "cancelled";
                    const isCurrent = p.token_number === td.current_token + 1;
                    return (
                      <div key={p.id} className={`rounded-xl border bg-card p-4 flex gap-3 items-center ${cancelled ? "opacity-50" : ""} ${isCurrent ? "ring-2 ring-primary" : ""}`}>
                        <div className="w-12 h-12 rounded-full gradient-hero flex items-center justify-center text-primary-foreground font-bold">
                          #{p.token_number}
                        </div>
                        {p.patient_image_url && <img src={p.patient_image_url} alt="Patient" className="w-12 h-12 rounded-lg object-cover"/>}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{p.profile?.full_name ?? "User"}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.profile?.email}</div>
                          {cancelled && <div className="text-xs text-destructive">Cancelled</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 text-center ${accent ? "gradient-hero text-primary-foreground" : "bg-muted"}`}>
      <div className="text-3xl font-extrabold">{value}</div>
      <div className="text-xs uppercase tracking-wider mt-1 opacity-80">{label}</div>
    </div>
  );
}