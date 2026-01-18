import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Shield, Copy, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TOTPSetupProps {
  onComplete: (sessionToken: string) => void;
}

const TOTPSetup = ({ onComplete }: TOTPSetupProps) => {
  const { toast } = useToast();
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateSecret();
  }, []);

  const generateSecret = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("totp-verify", {
        body: { action: "generate" },
      });

      if (error) throw error;
      setSecret(data.secret);
    } catch (error) {
      console.error("Error generating secret:", error);
      toast({
        title: "خطأ",
        description: "فشل في إنشاء مفتاح المصادقة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "تم النسخ",
      description: "تم نسخ المفتاح السري",
    });
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyCode.length !== 6) return;

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("totp-verify", {
        body: { action: "verify", code: verifyCode, secret },
      });

      if (error) throw error;

      if (data.valid) {
        // Save the secret securely via edge function (bypasses RLS)
        const { data: setupData, error: setupError } = await supabase.functions.invoke("totp-verify", {
          body: { action: "setup", secret },
        });

        if (setupError || !setupData?.success || !setupData?.sessionToken) throw setupError || new Error("Failed to save secret");

        toast({
          title: "تم الإعداد",
          description: "تم تفعيل المصادقة الثنائية بنجاح",
        });
        onComplete(setupData.sessionToken);
      } else {
        toast({
          title: "رمز خاطئ",
          description: data.rateLimited ? "محاولات كثيرة، انتظر 5 دقائق" : "الرمز غير صحيح، حاول مرة أخرى",
          variant: "destructive",
        });
        setVerifyCode("");
      }
    } catch (error) {
      console.error("Error verifying:", error);
      toast({
        title: "خطأ",
        description: "فشل في التحقق",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const otpauthUrl = `otpauth://totp/Mohim%20Admin?secret=${secret}&issuer=Mohim`;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="text-primary" size={32} />
        </div>
        <h2 className="text-xl font-bold text-primary mb-2">إعداد Google Authenticator</h2>
        <p className="text-muted-foreground text-sm">
          امسح رمز QR بتطبيق Google Authenticator
        </p>
      </div>

      <div className="flex justify-center">
        <div className="bg-white p-4 rounded-xl">
          <QRCodeSVG value={otpauthUrl} size={180} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground text-center">
          أو أدخل المفتاح يدوياً:
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-secondary px-3 py-2 rounded-lg text-sm font-mono text-center break-all">
            {secret}
          </code>
          <button
            onClick={copySecret}
            className="p-2 bg-secondary rounded-lg hover:bg-accent transition-colors"
          >
            {copied ? (
              <Check size={20} className="text-green-500" />
            ) : (
              <Copy size={20} className="text-secondary-foreground" />
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            أدخل الرمز للتأكيد
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full px-4 py-3 rounded-lg border border-border bg-background
                     text-center text-2xl tracking-[0.5em] font-mono
                     focus:outline-none focus:ring-2 focus:ring-primary/50"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={verifyCode.length !== 6 || verifying}
          className="w-full bg-cta text-cta-foreground py-3 rounded-lg font-semibold 
                   hover:brightness-105 transition-all disabled:opacity-50
                   flex items-center justify-center gap-2"
        >
          {verifying ? <Loader2 size={20} className="animate-spin" /> : null}
          تأكيد وتفعيل
        </button>
      </form>
    </div>
  );
};

export default TOTPSetup;
