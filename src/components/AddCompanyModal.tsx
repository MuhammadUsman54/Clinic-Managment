import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import AddressSearch, { AddressPick } from "./AddressSearch";
import { Loader2, X, Upload } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  since: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional(),
  timings: z.string().trim().min(1).max(120),
});

export default function AddCompanyModal({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [since, setSince] = useState("");
  const [timings, setTimings] = useState("");
  const [address, setAddress] = useState<AddressPick | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const reset = () => { setName(""); setSince(""); setTimings(""); setAddress(null); setFiles([]); };

  const submit = async () => {
    if (!user) return;
    const parsed = schema.safeParse({ name, since: since || undefined, timings });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    if (!address) { toast.error("Please pick an address from suggestions"); return; }
    setBusy(true);
    try {
      const certUrls: string[] = [];
      for (const f of files.slice(0, 3)) {
        const path = `${user.id}/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("certificates").upload(path, f);
        if (error) throw error;
        const { data } = supabase.storage.from("certificates").getPublicUrl(path);
        certUrls.push(data.publicUrl);
      }
      const { error } = await supabase.from("companies").insert({
        owner_id: user.id,
        name: parsed.data.name,
        since: parsed.data.since ?? null,
        timings: parsed.data.timings,
        address: address.address,
        latitude: address.latitude,
        longitude: address.longitude,
        certificate_urls: certUrls,
      });
      if (error) throw error;
      toast.success("Company added!");
      reset();
      onCreated();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to add company");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add a company</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={name} onChange={(e)=>setName(e.target.value)} maxLength={120}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Since</Label><Input type="number" value={since} onChange={(e)=>setSince(e.target.value)} placeholder="2010"/></div>
            <div><Label>Timings *</Label><Input value={timings} onChange={(e)=>setTimings(e.target.value)} placeholder="9 AM – 6 PM"/></div>
          </div>
          <div><Label>Address *</Label><AddressSearch value={address} onChange={setAddress}/></div>
          {address && (
            <div className="text-xs text-muted-foreground">
              📍 {address.latitude.toFixed(4)}, {address.longitude.toFixed(4)}
            </div>
          )}
          <div>
            <Label>Certificates (max 3 images)</Label>
            <label className="mt-1 flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
              <Upload className="w-4 h-4"/> <span className="text-sm">Click to upload</span>
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 3))}/>
            </label>
            {files.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {files.map((f, i) => (
                  <div key={i} className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1">
                    {f.name}<button onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="w-3 h-3"/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button onClick={submit} disabled={busy} className="w-full">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
            Add company
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}