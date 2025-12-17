import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSocialLinks } from "@/hooks/useSocialLinks";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { categories } from "@/data/projects";
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, Upload, User, Instagram, Send, Image, Loader2, Shield, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TOTPSetup from "@/components/TOTPSetup";
import TOTPLogin from "@/components/TOTPLogin";

interface ProjectFormData {
  title: string;
  description: string;
  image_url: string;
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

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { socialLinks, loading: socialLoading, refetch: refetchSocialLinks } = useSocialLinks();
  const { settings, refetch: refetchSettings } = useSiteSettings();
  
  const [authState, setAuthState] = useState<"loading" | "setup" | "login" | "authenticated">("loading");
  const [currentTotpCode, setCurrentTotpCode] = useState("");
  const [codeExpired, setCodeExpired] = useState(false);
  
  const [projects, setProjects] = useState<DBProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  
  const [editingProject, setEditingProject] = useState<DBProject | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeSection, setActiveSection] = useState<"projects" | "profile" | "settings">("projects");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState<ProjectFormData>({
    title: "",
    description: "",
    image_url: "",
    category: categories[1],
    link: "",
  });

  const [localSocialLinks, setLocalSocialLinks] = useState({
    instagram: "",
    telegram: "",
  });

  const [ogImage, setOgImage] = useState("");

  // Fetch projects from DB (read-only, no RLS issue for SELECT)
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

  // Admin operation wrapper - requires TOTP code
  const adminOperation = async (action: string, data: Record<string, unknown>) => {
    if (!currentTotpCode) {
      setCodeExpired(true);
      toast({
        title: "انتهت صلاحية الرمز",
        description: "أدخل رمز TOTP جديد للمتابعة",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data: result, error } = await supabase.functions.invoke("admin-operations", {
        body: { action, totpCode: currentTotpCode, data },
      });

      if (error) throw error;

      if (result?.error === "Invalid authentication code") {
        setCodeExpired(true);
        toast({
          title: "انتهت صلاحية الرمز",
          description: "أدخل رمز TOTP جديد للمتابعة",
          variant: "destructive",
        });
        return false;
      }

      return result?.success;
    } catch (error) {
      console.error("Admin operation error:", error);
      setCodeExpired(true);
      toast({
        title: "خطأ",
        description: "فشلت العملية، قد تحتاج لإدخال رمز جديد",
        variant: "destructive",
      });
      return false;
    }
  };

  // Check for existing TOTP secret on mount using edge function
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

  // Fetch projects when authenticated
  useEffect(() => {
    if (authState === "authenticated") {
      fetchProjects();
    }
  }, [authState, fetchProjects]);

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
    const success = await adminOperation("update_social_links", localSocialLinks);
    if (success) {
      toast({ title: "تم الحفظ", description: "تم حفظ روابط التواصل" });
      refetchSocialLinks();
    }
    setSaving(false);
  };

  const handleSaveOgImage = async () => {
    setSaving(true);
    const success = await adminOperation("update_setting", { key: "og_image", value: ogImage });
    if (success) {
      toast({ title: "تم الحفظ", description: "تم حفظ صورة OG" });
      refetchSettings();
    }
    setSaving(false);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      image_url: "",
      category: categories[1],
      link: "",
    });
    setEditingProject(null);
    setIsCreating(false);
  };

  const handleEdit = (project: DBProject) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description || "",
      image_url: project.image_url || "",
      category: project.category || categories[1],
      link: project.link || "",
    });
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingProject(null);
    resetForm();
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description || !formData.image_url) {
      toast({
        title: "حقول مفقودة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    let success = false;
    
    if (editingProject) {
      success = await adminOperation("update_project", {
        id: editingProject.id,
        title: formData.title,
        description: formData.description,
        image_url: formData.image_url,
        category: formData.category,
        link: formData.link || null,
      });
      if (success) {
        toast({ title: "تم التحديث", description: "تم تحديث المشروع بنجاح" });
      }
    } else {
      success = await adminOperation("add_project", {
        title: formData.title,
        description: formData.description,
        image_url: formData.image_url,
        category: formData.category,
        link: formData.link || null,
      });
      if (success) {
        toast({ title: "تم الإنشاء", description: "تم إضافة المشروع الجديد" });
      }
    }

    if (success) {
      resetForm();
      fetchProjects();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المشروع؟")) {
      const success = await adminOperation("delete_project", { id });
      if (success) {
        toast({ title: "تم الحذف", description: "تم حذف المشروع" });
        fetchProjects();
      }
    }
  };

  // Secure image upload via edge function with TOTP auth
  const secureImageUpload = async (file: File, path: string): Promise<string | null> => {
    if (!currentTotpCode) {
      setCodeExpired(true);
      toast({
        title: "انتهت صلاحية الرمز",
        description: "أدخل رمز TOTP جديد للمتابعة",
        variant: "destructive",
      });
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);
    formData.append("totpCode", currentTotpCode);

    const { data, error } = await supabase.functions.invoke("upload-image", {
      body: formData,
    });

    if (error) throw error;

    if (data?.error === "Invalid authentication code") {
      setCodeExpired(true);
      toast({
        title: "انتهت صلاحية الرمز",
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
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `projects/${fileName}`;

      const publicUrl = await secureImageUpload(file, filePath);
      
      if (publicUrl) {
        setFormData({ ...formData, image_url: publicUrl });
        toast({
          title: "تم الرفع",
          description: "تم رفع الصورة بنجاح",
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
            onComplete={() => setAuthState("authenticated")} 
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
        onSuccess={(code) => {
          setCurrentTotpCode(code);
          setCodeExpired(false);
          setAuthState("authenticated");
        }}
        onBack={() => navigate("/")}
      />
    );
  }

  // Re-authentication modal when code expires
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

        if (data?.valid) {
          setCurrentTotpCode(reAuthCode);
          setCodeExpired(false);
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
            <h3 className="font-bold text-foreground">انتهت صلاحية الرمز</h3>
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

  return (
    <div className="min-h-screen bg-card">
      {codeExpired && <ReAuthPrompt />}
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
        </div>

        {/* Settings Section */}
        {activeSection === "settings" && (
          <div className="bg-background rounded-xl p-6 border border-border shadow-lg max-w-md">
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
                        src={project.image_url || ""}
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
                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      صورة المشروع *
                    </label>
                    <div className="space-y-3">
                      {formData.image_url && (
                        <img
                          src={formData.image_url}
                          alt="Preview"
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.image_url}
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
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
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={uploading}
                          />
                        </label>
                      </div>
                    </div>
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
                      {categories.filter((c) => c !== "All").map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
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
      </div>
    </div>
  );
};

export default Admin;
