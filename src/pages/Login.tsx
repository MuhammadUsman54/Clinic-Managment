import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Ticket } from "lucide-react";

export default function Login() {
  const { user, loading, signInGoogle } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex relative gradient-hero p-12 flex-col justify-between text-primary-foreground overflow-hidden">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Ticket className="w-7 h-7" /> Tokenly
        </div>
        <div className="relative z-10">
          <h1 className="text-5xl font-extrabold leading-tight mb-4">Skip the line.<br/>Own your time.</h1>
          <p className="text-lg opacity-90 max-w-md">Buy queue tokens, track real-time progress, and get notified before your turn.</p>
        </div>
        <div className="text-sm opacity-70">© Tokenly 2026</div>
        <div aria-hidden className="absolute -right-32 -bottom-32 w-[500px] h-[500px] rounded-full bg-white/10 blur-3xl" />
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Welcome</h2>
            <p className="text-muted-foreground">Sign in to start managing or buying tokens.</p>
          </div>
          <Button onClick={signInGoogle} size="lg" className="w-full" variant="outline">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.3 14.5l-.8 3-2.9.1A10 10 0 012 12c0-1.6.4-3.2 1.1-4.5l2.6.5.9 2.6a6 6 0 00.7 2.9z"/><path fill="#FBBC05" d="M22 10.2a10 10 0 01-3.7 9.7l-3-.1-.4-2.7a6 6 0 002.6-3.5H12v-3.4h10z"/><path fill="#34A853" d="M18.3 19.8A10 10 0 011.6 17l3.7-3a6 6 0 008.6 3l3 2.7z"/><path fill="#4285F4" d="M18.4 4.3a10 10 0 013.6 5.9H12V14h6.1a6 6 0 01-2.6 3.5l3 2.7A10 10 0 0018.4 4.3z"/></svg>
            Continue with Google
          </Button>
          <p className="text-xs text-muted-foreground text-center">By continuing you agree to our Terms & Privacy.</p>
        </div>
      </div>
    </div>
  );
}