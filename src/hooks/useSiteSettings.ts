import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SiteSettings {
  og_image: string;
  [key: string]: string;
}

const defaultSettings: SiteSettings = {
  og_image: "",
};

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");

      if (error) throw error;

      if (data && data.length > 0) {
        const settingsObj: SiteSettings = { ...defaultSettings };
        data.forEach((item) => {
          settingsObj[item.key] = item.value || "";
        });
        setSettings(settingsObj);
      }
    } catch (error) {
      console.error("Error fetching site settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          { key, value },
          { onConflict: "key" }
        );

      if (error) throw error;

      setSettings((prev) => ({ ...prev, [key]: value }));
      toast({
        title: "تم الحفظ",
        description: "تم حفظ الإعدادات بنجاح",
      });
    } catch (error) {
      console.error("Error updating setting:", error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    settings,
    loading,
    updateSetting,
    refetch: fetchSettings,
  };
};
