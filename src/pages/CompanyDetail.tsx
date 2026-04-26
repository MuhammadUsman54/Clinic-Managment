import { useEffect, useRef, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import MapView from "@/components/MapView";
import { today } from "@/lib/today";
import { Clock, MapPin, Loader2, Upload, X, Ticket as TicketIcon, Bell } from "lucide-react";

type Company = { id: string; name: string; address: string; latitude: number | null; longitude: number | null; timings: string | null; since: number | null; certificate_urls: string[] };
type TokensDay = { id: string; total_tokens: number; current_token: number; estimated_minutes_per_token: number; is_allowed: boolean };
type Purchase = { id: string; token_number: number; status: string };

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const [c, setC] = useState<Company | null>(null);
  const [td, setTd] = useState<TokensDay | null>(null);
  const [my, setMy] = useState<Purchase | null>(null);
  const [taken, setTaken] = useState<number[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const notifiedRef = useRef(false);

  const load = async () => {
    if (!id) return;
    const { data: co } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
    setC(co as Company | null);
    const { data: t } = await supabase.from("tokens_day").select("*").eq("company_id", id).eq("day", today()).maybeSingle();
    setTd(t as TokensDay | null);
    if (t && user) {
      const { data: m } = await supabase.from("token_purchases").select("*").eq("tokens_day_id", (t as any).id).eq("user_id", user.id).eq("status", "active").maybeSingle();
      setMy(m as Purchase | null);
      const { data: all } = await supabase.from("token_purchases").select("token_number").eq("tokens_day_id", (t as any).id).eq("status", "active");
      setTaken(((all as any[]) ?? []).map((x) => x.token_number));
    } else {
      setMy(null); setTaken([]);
    }
  };

  useEffect(() => { load(); }, [id, user?.id]);

  // Realtime + 10-min notification
  useEffect(() => {
    if (!td) return;
    const ch = supabase.channel(`d-${td.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tokens_day", filter: `id=eq.${td.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "token_purchases", filter: `tokens_day_id=eq.${td.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [td?.id]);

  useEffect(() => {
    if (!td || !my || my.status !== "active") return;
    const ahead = my.token_number - td.current_token - 1;
    const minutes = Math.max(ahead, 0) * td.estimated_minutes_per_token;
    if (minutes > 0 && minutes <= 10 && !notifiedRef.current) {
      notifiedRef.current = true;
      toast(`⏰ Your token #${my.token_number} is in ~${minutes} min`, { duration: 8000, description: c?.name });
    }
    if (minutes > 10) notifiedRef.current = false;
  }, [td?.current_token, my?.token_number, td?.estimated_minutes_per_token]);

  if (loading) return null;
  if (!user) return <Navigate to="/" replace/>;
  if (!c) return <div className="min-h-screen"><AppHeader/><div className="p-8 text-muted-foreground">Loading…</div></div>;

  const nextNumber = td ? Math.max(td.current_token + 1, ...(taken.length ? taken : [0])) + 1 : 0;
  const ahead = td && my ? Math.max(my.token_number - td.current_token - 1, 0) : 0;
  const eta = td && my ? ahead * td.estimated_minutes_per_token : 0;

  const buy = async () => {
    if (!td || !user) return;
    if (!file) { toast.error("Please upload a patient image"); return; }
    if (!td.is_allowed) { toast.error("Tokens are not being issued today"); return; }
    if (taken.length >= td.total_tokens) { toast.error("All tokens are taken"); return; }
    setBusy(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("patients").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("patients").getPublicUrl(path);
      const { error } = await supabase.from("token_purchases").insert({
        tokens_day_id: td.id, company_id: c.id, user_id: user.id,
        token_number: nextNumber, patient_image_url: pub.publicUrl,
      });
      if (error) throw error;
      toast.success(`Token #${nextNumber} secured!`);
      setFile(null);
      load();
    } catch (e: any) { toast.error(e.message || "Failed to buy token"); }
    finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!my) return;
    const { error } = await supabase.from("token_purchases").update({ status: "cancelled" }).eq("id", my.id);
    if (error) toast.error(error.message); else { toast.success("Token cancelled"); load(); }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle={c.name}/>
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <section className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <h1 className="text-2xl font-bold">{c.name}</h1>
            {c.since && <p className="text-xs text-muted-foreground mt-1">Since {c.since}</p>}
            <p className="text-sm text-muted-foreground mt-2 flex items-start gap-1"><MapPin className="w-4 h-4 mt-0.5"/>{c.address}</p>
            {c.timings && <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-4 h-4"/>{c.timings}</p>}
            {c.certificate_urls.length > 0 && (
              <div className="flex gap-2 mt-4">
                {c.certificate_urls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer">
                    <img src={u} alt={`Certificate ${i+1}`} className="w-16 h-16 object-cover rounded-lg border"/>
                  </a>
                ))}
              </div>
            )}
          </div>
          {c.latitude && c.longitude ? (
            <MapView lat={c.latitude} lng={c.longitude} label={c.name}/>
          ) : <div className="rounded-2xl border bg-muted/30 flex items-center justify-center text-muted-foreground">No location</div>}
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-card">
          {!td ? (
            <p className="text-muted-foreground">This company hasn't started today's tokens yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Stat label="Total" value={td.total_tokens}/>
                <Stat label="Current" value={td.current_token} accent/>
                <Stat label="Available" value={Math.max(td.total_tokens - taken.length, 0)}/>
              </div>

              {my && my.status === "active" ? (
                <div className="rounded-xl gradient-hero p-6 text-primary-foreground">
                  <div className="flex items-center gap-2 text-sm opacity-90"><TicketIcon className="w-4 h-4"/>Your token</div>
                  <div className="text-5xl font-extrabold mt-2">#{my.token_number}</div>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <Bell className="w-4 h-4"/>
                    {ahead === 0 ? "You're up next!" : `~${eta} min away (${ahead} ahead of you)`}
                  </div>
                  <Button variant="secondary" className="mt-4" onClick={cancel}>Cancel token</Button>
                </div>
              ) : (
                <div>
                  <h3 className="font-bold text-lg mb-1">Buy a token</h3>
                  <p className="text-sm text-muted-foreground mb-3">Upload patient photo. You'll be #{nextNumber}.</p>
                  <label className="flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                    <Upload className="w-4 h-4"/><span className="text-sm">{file ? file.name : "Patient image"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e)=>setFile(e.target.files?.[0] ?? null)}/>
                  </label>
                  {file && <button className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-1" onClick={()=>setFile(null)}><X className="w-3 h-3"/>remove</button>}
                  <Button onClick={buy} disabled={busy || !td.is_allowed} className="w-full mt-4" size="lg">
                    {busy && <Loader2 className="w-4 h-4 animate-spin mr-2"/>}
                    {td.is_allowed ? `Buy token #${nextNumber}` : "Tokens disabled today"}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
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