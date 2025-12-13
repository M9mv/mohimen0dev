import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SocialLinks {
  instagram: string;
  telegram: string;
}

const defaultSocialLinks: SocialLinks = {
  instagram: "m1w_c",
  telegram: "M_lq3",
};

export const useSocialLinks = () => {
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(defaultSocialLinks);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSocialLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("social_links")
        .select("*");

      if (error) throw error;

      if (data && data.length > 0) {
        const links: SocialLinks = { ...defaultSocialLinks };
        data.forEach((item) => {
          if (item.platform === "instagram") links.instagram = item.username;
          if (item.platform === "telegram") links.telegram = item.username;
        });
        setSocialLinks(links);
      }
    } catch (error) {
      console.error("Error fetching social links:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocialLinks();
  }, []);

  const updateSocialLinks = async (newLinks: SocialLinks) => {
    try {
      // Update or insert Instagram
      const { error: igError } = await supabase
        .from("social_links")
        .upsert(
          { platform: "instagram", username: newLinks.instagram },
          { onConflict: "platform" }
        );

      if (igError) throw igError;

      // Update or insert Telegram
      const { error: tgError } = await supabase
        .from("social_links")
        .upsert(
          { platform: "telegram", username: newLinks.telegram },
          { onConflict: "platform" }
        );

      if (tgError) throw tgError;

      setSocialLinks(newLinks);
      toast({
        title: "تم الحفظ",
        description: "تم حفظ روابط التواصل الاجتماعي بنجاح",
      });
    } catch (error) {
      console.error("Error updating social links:", error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ الروابط",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    socialLinks,
    loading,
    updateSocialLinks,
    refetch: fetchSocialLinks,
  };
};
