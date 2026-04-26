import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Ticket, RefreshCcw } from "lucide-react";

export default function AppHeader({ subtitle }: { subtitle?: string }) {
  const { signOut, profile, setRole } = useAuth();
  const nav = useNavigate();
  const switchRole = async () => {
    if (!profile) return;
    const next = profile.role === "company" ? "user" : "company";
    await setRole(next);
    nav(next === "company" ? "/companies" : "/discover");
  };
  return (
    <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/home" className="flex items-center gap-2 font-bold">
          <Ticket className="w-5 h-5 text-primary"/> Tokenly
          {subtitle && <span className="text-muted-foreground font-normal text-sm ml-2">/ {subtitle}</span>}
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={switchRole}><RefreshCcw className="w-4 h-4 mr-2"/>Switch role</Button>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); nav("/"); }}><LogOut className="w-4 h-4 mr-2"/>Sign out</Button>
        </div>
      </div>
    </header>
  );
}