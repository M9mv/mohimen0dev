import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSocialLinks } from "@/hooks/useSocialLinks";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, Upload, User, Instagram, Send, Image, Loader2, Shield, Key, Star, StarOff, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TOTPSetup from "@/components/TOTPSetup";
import TOTPLogin from "@/components/TOTPLogin";
import StoreOrdersSection from "@/components/admin/StoreOrdersSection";

interface ProjectFormData {
  title: string;
  description: string;
  category: string;
  link: string;
}

interface DBProject {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  link: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectImage {
  id: string;
  project_id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

interface Category {
  id: string;
  name: string;
  is_default: boolean;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { socialLinks, loading: socialLoading, refetch: refetchSocialLinks } = useSocialLinks();
  const { settings, refetch: refetchSettings } = useSiteSettings();
  
  const [authState, setAuthState] = useState<"loading" | "setup" | "login" | "authenticated">("loading");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  
  const [projects, setProjects] = useState<DBProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  
  const [editingProject, setEditingProject] = useState<DBProject | null>(null);
  const [projectImages, setProjectImages] = useState<ProjectImage[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [activeSection, setActiveSection] = useState<"projects" | "profile" | "settings" | "store">("projects");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState<ProjectFormData>({
    title: "",
    description: "",
    category: "",
    link: "",
  });

  const [pendingImages, setPendingImages] = useState<{ url: string; isPrimary: boolean }[]>([]);

  const [localSocialLinks, setLocalSocialLinks] = useState({
    instagram: "",
    telegram: "",
  });

  const [ogImage, setOgImage] = useState("");

  // Fetch projects from DB
  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  // Fetch categories from DB
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  // Fetch project images
  const fetchProjectImages = useCallback(async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from("project_images")
        .select("*")
        .eq("project_id", projectId)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      setProjectImages(data || []);
    } catch (error) {
      console.error("Error fetching project images:", error);
      setProjectImages([]);
    }
  }, []);

  // Admin operation wrapper - requires session token
  const adminOperation = async (action: string, data: Record<string, unknown>) => {
    if (!sessionToken) {
      setSessionExpired(true);
      toast({
        title: "انتهت الجلسة",
        description: "أدخل رمز TOTP جديد للمتابعة",
        variant: "destructive",
      });
      return { success: false };
    }

    try {
      const { data: result, error } = await supabase.functions.invoke("admin-operations", {
        body: { action, sessionToken, data },
      });

      if (error) throw error;

      if (result?.sessionExpired) {
        setSessionExpired(true);
        toast({
          title: "انتهت الجلسة",
          description: "أدخل رمز TOTP جديد للمتابعة",
          variant: "destructive",
        });
        return { success: false };
      }

      return result;
    } catch (error) {
      console.error("Admin operation error:", error);
      toast({
        title: "خطأ",
        description: "فشلت العملية",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  // Check for existing TOTP secret on mount
  useEffect(() => {
    const checkTOTPSecret = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("totp-verify", {
          body: { action: "check" },
        });

        if (error) throw error;

        if (data?.configured) {
          setAuthState("login");
        } else {
          setAuthState("setup");
        }
      } catch (error) {
        console.error("Error checking TOTP:", error);
        setAuthState("setup");
      }
    };

    checkTOTPSecret();
  }, []);

  // Fetch data when authenticated
  useEffect(() => {
    if (authState === "authenticated") {
      fetchProjects();
      fetchCategories();
    }
  }, [authState, fetchProjects, fetchCategories]);

  useEffect(() => {
    if (!socialLoading) {
      setLocalSocialLinks(socialLinks);
    }
  }, [socialLinks, socialLoading]);

  useEffect(() => {
    setOgImage(settings.og_image || "");
  }, [settings]);

  const handleSaveSocialLinks = async () => {
    setSaving(true);
    const result = await adminOperation("update_social_links", localSocialLinks);
    if (result?.success) {
      toast({ title: "تم الحفظ", description: "تم حفظ روابط التواصل" });
      refetchSocialLinks();
    }
    setSaving(false);
  };

  const handleSaveOgImage = async () => {
    setSaving(true);
    const result = await adminOperation("update_setting", { key: "og_image", value: ogImage });
    if (result?.success) {
      toast({ title: "تم الحفظ", description: "تم حفظ صورة OG" });
      refetchSettings();
    }
    setSaving(false);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setAddingCategory(true);
    const result = await adminOperation("add_category", { name: newCategoryName.trim() });
    if (result?.success) {
      toast({ title: "تم الإضافة", description: "تم إضافة التصنيف الجديد" });
      setNewCategoryName("");
      fetchCategories();
    } else if (result?.error) {
      toast({ title: "خطأ", description: result.error, variant: "destructive" });
    }
    setAddingCategory(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التصنيف؟")) return;
    
    const result = await adminOperation("delete_category", { id });
    if (result?.success) {
      toast({ title: "تم الحذف", description: "تم حذف التصنيف" });
      fetchCategories();
    } else if (result?.error) {
      toast({ title: "خطأ", description: result.error, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: categories[0]?.name || "",
      link: "",
    });
    setPendingImages([]);
    setProjectImages([]);
    setEditingProject(null);
    setIsCreating(false);
  };

  const handleEdit = async (project: DBProject) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description || "",
      category: project.category || "",
      link: project.link || "",
    });
    setIsCreating(false);
    setPendingImages([]);
    await fetchProjectImages(project.id);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingProject(null);
    setFormData({
      title: "",
      description: "",
      category: categories[0]?.name || "",
      link: "",
    });
    setPendingImages([]);
    setProjectImages([]);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description) {
      toast({
        title: "حقول مفقودة",
        description: "يرجى ملء العنوان والوصف",
        variant: "destructive",
      });
      return;
    }

    // Check for at least one image
    const hasImages = editingProject 
      ? projectImages.length > 0 
      : pendingImages.length > 0;
    
    if (!hasImages) {
      toast({
        title: "صورة مطلوبة",
        description: "يرجى إضافة صورة واحدة على الأقل",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    try {
      if (editingProject) {
        // Update existing project
        const result = await adminOperation("update_project", {
          id: editingProject.id,
          title: formData.title,
          description: formData.description,
          image_url: projectImages.find(img => img.is_primary)?.image_url || projectImages[0]?.image_url || null,
          category: formData.category,
          link: formData.link || null,
        });
        
        if (result?.success) {
          // Add any pending images
          if (pendingImages.length > 0) {
            await adminOperation("add_project_images", {
              project_id: editingProject.id,
              images: pendingImages.map((img, idx) => ({
                image_url: img.url,
                is_primary: img.isPrimary,
                display_order: projectImages.length + idx,
              })),
            });
          }
          
          toast({ title: "تم التحديث", description: "تم تحديث المشروع بنجاح" });
          resetForm();
          fetchProjects();
        }
      } else {
        // Create new project
        const primaryImage = pendingImages.find(img => img.isPrimary) || pendingImages[0];
        
        const result = await adminOperation("add_project", {
          title: formData.title,
          description: formData.description,
          image_url: primaryImage?.url || null,
          category: formData.category,
          link: formData.link || null,
        });
        
        if (result?.success && result?.project) {
          // Add images to project_images table
          if (pendingImages.length > 0) {
            await adminOperation("add_project_images", {
              project_id: result.project.id,
              images: pendingImages.map((img, idx) => ({
                image_url: img.url,
                is_primary: img.isPrimary,
                display_order: idx,
              })),
            });
          }
          
          toast({ title: "تم الإنشاء", description: "تم إضافة المشروع الجديد" });
          resetForm();
          fetchProjects();
        }
      }
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ المشروع",
        variant: "destructive",
      });
    }
    
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المشروع؟")) {
      const result = await adminOperation("delete_project", { id });
      if (result?.success) {
        toast({ title: "تم الحذف", description: "تم حذف المشروع" });
        resetForm();
        fetchProjects();
      }
    }
  };

  // Secure image upload via edge function with session token
  const secureImageUpload = async (file: File, path: string): Promise<string | null> => {
    if (!sessionToken) {
      setSessionExpired(true);
      toast({
        title: "انتهت الجلسة",
        description: "أدخل رمز TOTP جديد للمتابعة",
        variant: "destructive",
      });
      return null;
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("path", path);
    uploadFormData.append("sessionToken", sessionToken);

    const { data, error } = await supabase.functions.invoke("upload-image", {
      body: uploadFormData,
    });

    if (error) throw error;

    if (data?.sessionExpired) {
      setSessionExpired(true);
      toast({
        title: "انتهت الجلسة",
        description: "أدخل رمز TOTP جديد للمتابعة",
        variant: "destructive",
      });
      return null;
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data?.publicUrl || null;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${Date.now()}_${i}.${fileExt}`;
        const filePath = `projects/${fileName}`;

        const publicUrl = await secureImageUpload(file, filePath);
        
        if (publicUrl) {
          if (editingProject) {
            // Add image directly to project
            const result = await adminOperation("add_project_images", {
              project_id: editingProject.id,
              images: [{
                image_url: publicUrl,
                is_primary: projectImages.length === 0,
                display_order: projectImages.length,
              }],
            });
            
            if (result?.success) {
              await fetchProjectImages(editingProject.id);
            }
          } else {
            // Add to pending images for new project
            setPendingImages(prev => [...prev, { 
              url: publicUrl, 
              isPrimary: prev.length === 0 
            }]);
          }
        }
      }
      
      toast({
        title: "تم الرفع",
        description: `تم رفع ${files.length} صورة بنجاح`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل في رفع الصورة",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = "";
    }
  };

  const handleSetPrimaryImage = async (imageId: string) => {
    if (editingProject) {
      const result = await adminOperation("set_primary_image", {
        project_id: editingProject.id,
        image_id: imageId,
      });
      
      if (result?.success) {
        await fetchProjectImages(editingProject.id);
        
        // Update project's main image_url
        const primaryImg = projectImages.find(img => img.id === imageId);
        if (primaryImg) {
          await adminOperation("update_project", {
            id: editingProject.id,
            image_url: primaryImg.image_url,
          });
        }
        
        toast({ title: "تم التحديث", description: "تم تعيين الصورة الرئيسية" });
      }
    } else {
      // For pending images
      setPendingImages(prev => prev.map(img => ({
        ...img,
        isPrimary: img.url === pendingImages.find((_, idx) => idx.toString() === imageId)?.url,
      })));
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (editingProject) {
      const result = await adminOperation("delete_project_image", { id: imageId });
      
      if (result?.success) {
        await fetchProjectImages(editingProject.id);
        toast({ title: "تم الحذف", description: "تم حذف الصورة" });
      }
    } else {
      // For pending images
      const idx = parseInt(imageId);
      setPendingImages(prev => {
        const newImages = prev.filter((_, i) => i !== idx);
        // If we deleted the primary, make the first one primary
        if (prev[idx]?.isPrimary && newImages.length > 0) {
          newImages[0].isPrimary = true;
        }
        return newImages;
      });
    }
  };

  const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `og-image.${fileExt}`;
      const filePath = `settings/${fileName}`;

      const publicUrl = await secureImageUpload(file, filePath);
      
      if (publicUrl) {
        setOgImage(publicUrl);
        toast({
          title: "تم الرفع",
          description: "تم رفع صورة OG بنجاح",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل في رفع الصورة",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Loading state
  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  // TOTP Setup Screen
  if (authState === "setup") {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center p-4">
        <div className="bg-background rounded-xl p-8 border border-border shadow-lg max-w-sm w-full">
          <TOTPSetup 
            onComplete={(token) => {
              setSessionToken(token);
              setAuthState("authenticated");
            }} 
          />
          <button
            onClick={() => navigate("/")}
            className="w-full mt-4 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  // TOTP Login Screen
  if (authState === "login") {
    return (
      <TOTPLogin
        onSuccess={(token) => {
          setSessionToken(token);
          setSessionExpired(false);
          setAuthState("authenticated");
        }}
        onBack={() => navigate("/")}
      />
    );
  }

  // Re-authentication modal when session expires
  const ReAuthPrompt = () => {
    const [reAuthCode, setReAuthCode] = useState("");
    const [verifying, setVerifying] = useState(false);

    const handleReAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      if (reAuthCode.length !== 6) return;

      setVerifying(true);
      try {
        const { data } = await supabase.functions.invoke("totp-verify", {
          body: { action: "verify", code: reAuthCode },
        });

        if (data?.valid && data?.sessionToken) {
          setSessionToken(data.sessionToken);
          setSessionExpired(false);
          toast({ title: "تم التحقق", description: "يمكنك المتابعة الآن" });
        } else {
          toast({
            title: data?.rateLimited ? "محاولات كثيرة" : "رمز خاطئ",
            description: data?.rateLimited ? "انتظر 5 دقائق" : "حاول مرة أخرى",
            variant: "destructive",
          });
          setReAuthCode("");
        }
      } catch (error) {
        console.error("Re-auth error:", error);
      } finally {
        setVerifying(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-xl p-6 border border-border shadow-lg max-w-sm w-full">
          <div className="text-center mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
              <Key className="text-amber-500" size={24} />
            </div>
            <h3 className="font-bold text-foreground">انتهت الجلسة</h3>
            <p className="text-sm text-muted-foreground">أدخل رمز TOTP جديد للمتابعة</p>
          </div>
          <form onSubmit={handleReAuth}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={reAuthCode}
              onChange={(e) => setReAuthCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full px-4 py-3 rounded-lg border border-border bg-background
                       text-center text-2xl tracking-[0.5em] font-mono mb-4
                       focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
            <button
              type="submit"
              disabled={reAuthCode.length !== 6 || verifying}
              className="w-full bg-cta text-cta-foreground py-2 rounded-lg font-semibold 
                       hover:brightness-105 transition-all disabled:opacity-50
                       flex items-center justify-center gap-2"
            >
              {verifying ? <Loader2 size={18} className="animate-spin" /> : null}
              تأكيد
            </button>
          </form>
        </div>
      </div>
    );
  };

  // Get primary image for display
  const getPrimaryImageUrl = (project: DBProject) => {
    return project.image_url || "";
  };

  return (
    <div className="min-h-screen bg-card">
      {sessionExpired && <ReAuthPrompt />}
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="text-primary" size={24} />
            </button>
            <h1 className="text-2xl font-bold text-primary">Admin Panel</h1>
          </div>
          {activeSection === "projects" && (
            <button
              onClick={handleCreate}
              className="bg-cta text-cta-foreground px-4 py-2 rounded-lg font-semibold 
                       hover:brightness-105 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              إضافة مشروع
            </button>
          )}
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveSection("projects")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeSection === "projects"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            المشاريع
          </button>
          <button
            onClick={() => setActiveSection("profile")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeSection === "profile"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            روابط التواصل
          </button>
          <button
            onClick={() => setActiveSection("settings")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeSection === "settings"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            الإعدادات
          </button>
          <button
            onClick={() => setActiveSection("store")}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeSection === "store"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            <ShoppingBag size={18} />
            المتجر
          </button>
        </div>

        {/* Settings Section */}
        {activeSection === "settings" && (
          <div className="space-y-6 max-w-md">
            {/* OG Image */}
            <div className="bg-background rounded-xl p-6 border border-border shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <Image className="text-primary" size={24} />
                <h2 className="text-xl font-bold text-primary">صورة المشاركة (OG Image)</h2>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  هذه الصورة ستظهر عند مشاركة الموقع على Twitter وغيرها
                </p>
                
                {ogImage && (
                  <img
                    src={ogImage}
                    alt="OG Preview"
                    className="w-full h-40 object-cover rounded-lg border border-border"
                  />
                )}
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg border border-border bg-background 
                             focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="رابط الصورة"
                  />
                  <label className="p-2 bg-secondary rounded-lg cursor-pointer hover:bg-accent transition-colors">
                    {uploading ? (
                      <Loader2 size={20} className="text-secondary-foreground animate-spin" />
                    ) : (
                      <Upload size={20} className="text-secondary-foreground" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleOgImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
                
                <button
                  onClick={handleSaveOgImage}
                  disabled={saving}
                  className="w-full bg-cta text-cta-foreground py-3 rounded-lg font-semibold 
                           hover:brightness-105 transition-all flex items-center justify-center gap-2
                           disabled:opacity-50"
                >
                  {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  حفظ التغييرات
                </button>
              </div>
            </div>

            {/* Categories */}
            <div className="bg-background rounded-xl p-6 border border-border shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="text-primary" size={24} />
                <h2 className="text-xl font-bold text-primary">التصنيفات</h2>
              </div>
              
              <div className="space-y-4">
                {/* Add new category */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg border border-border bg-background 
                             focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="اسم التصنيف الجديد"
                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                  />
                  <button
                    onClick={handleAddCategory}
                    disabled={addingCategory || !newCategoryName.trim()}
                    className="px-4 py-2 bg-cta text-cta-foreground rounded-lg font-semibold 
                             hover:brightness-105 transition-all disabled:opacity-50
                             flex items-center gap-2"
                  >
                    {addingCategory ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    إضافة
                  </button>
                </div>

                {/* Categories list */}
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                    >
                      <span className="text-foreground">
                        {cat.name}
                        {cat.is_default && (
                          <span className="text-xs text-muted-foreground mr-2">(افتراضي)</span>
                        )}
                      </span>
                      {!cat.is_default && (
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Section */}
        {activeSection === "profile" && (
          <div className="bg-background rounded-xl p-6 border border-border shadow-lg max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <User className="text-primary" size={24} />
              <h2 className="text-xl font-bold text-primary">روابط التواصل</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <Instagram size={18} />
                  Instagram Username
                </label>
                <input
                  type="text"
                  value={localSocialLinks.instagram}
                  onChange={(e) => setLocalSocialLinks({ ...localSocialLinks, instagram: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                           focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="username"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <Send size={18} />
                  Telegram Username
                </label>
                <input
                  type="text"
                  value={localSocialLinks.telegram}
                  onChange={(e) => setLocalSocialLinks({ ...localSocialLinks, telegram: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                           focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="username"
                />
              </div>
              
              <button
                onClick={handleSaveSocialLinks}
                disabled={saving}
                className="w-full bg-cta text-cta-foreground py-3 rounded-lg font-semibold 
                         hover:brightness-105 transition-all flex items-center justify-center gap-2
                         disabled:opacity-50"
              >
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                حفظ التغييرات
              </button>
            </div>
          </div>
        )}

        {/* Projects Section */}
        {activeSection === "projects" && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Project List */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-primary mb-4">
                المشاريع ({projects.length})
                {projectsLoading && <Loader2 className="inline ml-2 animate-spin" size={20} />}
              </h2>
              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`bg-background rounded-lg p-4 border transition-all ${
                      editingProject?.id === project.id
                        ? "border-primary shadow-lg"
                        : "border-border hover:border-accent"
                    }`}
                  >
                    <div className="flex gap-4">
                      <img
                        src={getPrimaryImageUrl(project)}
                        alt={project.title}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{project.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{project.category}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(project)}
                            className="p-2 bg-primary text-primary-foreground rounded-lg 
                                     hover:brightness-110 transition-all"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
                            className="p-2 bg-destructive text-destructive-foreground rounded-lg 
                                     hover:brightness-110 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Edit/Create Form */}
            {(editingProject || isCreating) && (
              <div className="bg-background rounded-xl p-6 border border-border shadow-lg h-fit sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-primary">
                    {editingProject ? "تعديل المشروع" : "إنشاء مشروع جديد"}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                  >
                    <X size={20} className="text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Images Section */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      صور المشروع * (يمكنك إضافة عدة صور)
                    </label>
                    
                    {/* Display existing images for editing */}
                    {editingProject && projectImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {projectImages.map((img) => (
                          <div key={img.id} className="relative group">
                            <img
                              src={img.image_url}
                              alt="Project"
                              className={`w-full h-24 object-cover rounded-lg border-2 ${
                                img.is_primary ? "border-primary" : "border-transparent"
                              }`}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 
                                          transition-opacity rounded-lg flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleSetPrimaryImage(img.id)}
                                className={`p-1 rounded ${
                                  img.is_primary ? "bg-primary text-primary-foreground" : "bg-white text-black"
                                }`}
                                title={img.is_primary ? "الصورة الرئيسية" : "تعيين كرئيسية"}
                              >
                                {img.is_primary ? <Star size={14} /> : <StarOff size={14} />}
                              </button>
                              <button
                                onClick={() => handleDeleteImage(img.id)}
                                className="p-1 rounded bg-destructive text-destructive-foreground"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            {img.is_primary && (
                              <span className="absolute top-1 right-1 text-xs bg-primary text-primary-foreground px-1 rounded">
                                رئيسية
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Display pending images for new project */}
                    {!editingProject && pendingImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {pendingImages.map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={img.url}
                              alt="Project"
                              className={`w-full h-24 object-cover rounded-lg border-2 ${
                                img.isPrimary ? "border-primary" : "border-transparent"
                              }`}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 
                                          transition-opacity rounded-lg flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setPendingImages(prev => prev.map((p, i) => ({
                                    ...p,
                                    isPrimary: i === idx,
                                  })));
                                }}
                                className={`p-1 rounded ${
                                  img.isPrimary ? "bg-primary text-primary-foreground" : "bg-white text-black"
                                }`}
                                title={img.isPrimary ? "الصورة الرئيسية" : "تعيين كرئيسية"}
                              >
                                {img.isPrimary ? <Star size={14} /> : <StarOff size={14} />}
                              </button>
                              <button
                                onClick={() => handleDeleteImage(idx.toString())}
                                className="p-1 rounded bg-destructive text-destructive-foreground"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            {img.isPrimary && (
                              <span className="absolute top-1 right-1 text-xs bg-primary text-primary-foreground px-1 rounded">
                                رئيسية
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload button */}
                    <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed 
                                    border-border rounded-lg cursor-pointer hover:border-primary 
                                    hover:bg-primary/5 transition-colors">
                      {uploading ? (
                        <Loader2 size={20} className="text-primary animate-spin" />
                      ) : (
                        <Upload size={20} className="text-primary" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {uploading ? "جاري الرفع..." : "انقر لرفع صور"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      العنوان *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                               focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="عنوان المشروع"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      الوصف *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                               focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      placeholder="وصف المشروع"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      التصنيف
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                               focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">اختر تصنيفاً</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Link */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      رابط المشروع (اختياري)
                    </label>
                    <input
                      type="url"
                      value={formData.link}
                      onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                               focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="https://..."
                    />
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-cta text-cta-foreground py-3 rounded-lg font-semibold 
                             hover:brightness-105 transition-all flex items-center justify-center gap-2
                             disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    {editingProject ? "حفظ التغييرات" : "إنشاء المشروع"}
                  </button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!editingProject && !isCreating && (
              <div className="bg-background rounded-xl p-8 border border-dashed border-border flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Pencil size={24} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  اختر مشروعاً للتعديل
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  أو أنشئ مشروعاً جديداً باستخدام الزر أعلاه
                </p>
              </div>
            )}
          </div>
        )}

        {/* Store Section */}
        {activeSection === "store" && sessionToken && (
          <StoreOrdersSection
            sessionToken={sessionToken}
            onSessionExpired={() => setSessionExpired(true)}
          />
        )}
      </div>
    </div>
  );
};

export default Admin;
