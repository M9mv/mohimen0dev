import { useState } from "react";
import { Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TOTPLoginProps {
  onSuccess: (code: string) => void;
  onBack: () => void;
}

const TOTPLogin = ({ onSuccess, onBack }: TOTPLoginProps) => {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setVerifying(true);
    setError(false);

    try {
      // Server-side verification - no secret needed client-side
      const { data, error: fnError } = await supabase.functions.invoke("totp-verify", {
        body: { action: "verify", code },
      });

      if (fnError) throw fnError;

      if (data.valid) {
        onSuccess(code);
      } else {
        setError(true);
        setCode("");
        toast({
          title: data.rateLimited ? "محاولات كثيرة" : "رمز خاطئ",
          description: data.rateLimited 
            ? "انتظر 5 دقائق قبل المحاولة مرة أخرى" 
            : "الرمز غير صحيح، حاول مرة أخرى",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error verifying:", error);
      toast({
        title: "خطأ",
        description: "فشل في التحقق من الرمز",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-card flex items-center justify-center p-4">
      <div className="bg-background rounded-xl p-8 border border-border shadow-lg max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="text-primary" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">
            أدخل رمز Google Authenticator
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
                setError(false);
              }}
              placeholder="000000"
              className={`w-full px-4 py-3 rounded-lg border text-center text-2xl 
                        tracking-[0.5em] font-mono bg-background
                        focus:outline-none focus:ring-2 focus:ring-primary/50
                        ${error ? "border-destructive" : "border-border"}`}
              autoFocus
            />
            {error && (
              <p className="text-destructive text-sm mt-2 text-center">
                رمز خاطئ، حاول مرة أخرى
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={code.length !== 6 || verifying}
            className="w-full bg-cta text-cta-foreground py-3 rounded-lg font-semibold 
                     hover:brightness-105 transition-all disabled:opacity-50
                     flex items-center justify-center gap-2"
          >
            {verifying ? <Loader2 size={20} className="animate-spin" /> : null}
            دخول
          </button>
        </form>

        <button
          onClick={onBack}
          className="w-full mt-4 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          العودة للرئيسية
        </button>
      </div>
    </div>
  );
};

export default TOTPLogin;
