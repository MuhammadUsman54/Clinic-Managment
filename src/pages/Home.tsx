import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Building2, UserRound, LogOut, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, profile, loading, setRole, signOut } = useAuth();
  const nav = useNavigate();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;

  const choose = async (role: "company" | "user") => {
    await setRole(role);
    nav(role === "company" ? "/companies" : "/discover");
  };

  // If they already picked a role, route them there
  if (profile?.role === "company") return <Navigate to="/companies" replace />;
  if (profile?.role === "user") return <Navigate to="/discover" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2 font-bold"><Ticket className="w-5 h-5 text-primary"/> Tokenly</div>
        <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-2"/>Sign out</Button>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">Hi {profile?.full_name?.split(" ")[0] ?? "there"} 👋</h1>
          <p className="text-muted-foreground text-lg mb-12">Tell us how you'll use Tokenly today.</p>
          <div className="grid md:grid-cols-2 gap-6">
            <button onClick={() => choose("company")} className="group text-left rounded-2xl border bg-card p-8 shadow-card hover:shadow-soft hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 rounded-xl gradient-hero flex items-center justify-center mb-5 text-primary-foreground"><Building2 className="w-7 h-7"/></div>
              <h3 className="text-2xl font-bold mb-2">I'm a Company</h3>
              <p className="text-muted-foreground">Register your business and start issuing daily tokens to your customers.</p>
              <p className="mt-4 text-primary font-medium group-hover:translate-x-1 transition-transform inline-block">Continue →</p>
            </button>
            <button onClick={() => choose("user")} className="group text-left rounded-2xl border bg-card p-8 shadow-card hover:shadow-soft hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-5"><UserRound className="w-7 h-7"/></div>
              <h3 className="text-2xl font-bold mb-2">I'm finding tokens</h3>
              <p className="text-muted-foreground">Find nearby companies, buy a token, and skip the queue.</p>
              <p className="mt-4 text-primary font-medium group-hover:translate-x-1 transition-transform inline-block">Continue →</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}