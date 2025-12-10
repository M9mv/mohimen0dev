import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/context/ProjectContext";
import { Project } from "@/types/project";
import { categories } from "@/data/projects";
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, Upload, User, Instagram, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { projects, addProject, updateProject, deleteProject } = useProjects();
  
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeSection, setActiveSection] = useState<"projects" | "profile">("projects");
  const [formData, setFormData] = useState<Omit<Project, "id">>({
    title: "",
    description: "",
    image: "",
    category: categories[1],
    technologies: [],
    link: "",
  });
  const [techInput, setTechInput] = useState("");

  // Profile settings
  const [socialLinks, setSocialLinks] = useState({
    instagram: "Mqw_c",
    telegram: "M_lq3",
  });

  useEffect(() => {
    const saved = localStorage.getItem("mohimen-social-links");
    if (saved) {
      setSocialLinks(JSON.parse(saved));
    }
  }, []);

  const handleSaveSocialLinks = () => {
    localStorage.setItem("mohimen-social-links", JSON.stringify(socialLinks));
    toast({
      title: "تم الحفظ",
      description: "تم حفظ روابط التواصل الاجتماعي بنجاح",
    });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      image: "",
      category: categories[1],
      technologies: [],
      link: "",
    });
    setTechInput("");
    setEditingProject(null);
    setIsCreating(false);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description,
      image: project.image,
      category: project.category,
      technologies: project.technologies || [],
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

  const handleSave = () => {
    if (!formData.title || !formData.description || !formData.image) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (editingProject) {
      updateProject(editingProject.id, formData);
      toast({
        title: "Project Updated",
        description: "The project has been successfully updated.",
      });
    } else {
      addProject(formData);
      toast({
        title: "Project Created",
        description: "The new project has been added.",
      });
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProject(id);
      toast({
        title: "Project Deleted",
        description: "The project has been removed.",
      });
    }
  };

  const handleAddTech = () => {
    if (techInput.trim() && !formData.technologies?.includes(techInput.trim())) {
      setFormData({
        ...formData,
        technologies: [...(formData.technologies || []), techInput.trim()],
      });
      setTechInput("");
    }
  };

  const handleRemoveTech = (tech: string) => {
    setFormData({
      ...formData,
      technologies: formData.technologies?.filter((t) => t !== tech),
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-card">
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
              Add Project
            </button>
          )}
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6">
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
            الملف الشخصي
          </button>
        </div>

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
                  value={socialLinks.instagram}
                  onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
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
                  value={socialLinks.telegram}
                  onChange={(e) => setSocialLinks({ ...socialLinks, telegram: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                           focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="username"
                />
              </div>
              
              <button
                onClick={handleSaveSocialLinks}
                className="w-full bg-cta text-cta-foreground py-3 rounded-lg font-semibold 
                         hover:brightness-105 transition-all flex items-center justify-center gap-2"
              >
                <Save size={20} />
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
              <h2 className="text-xl font-bold text-primary mb-4">Projects ({projects.length})</h2>
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
                        src={project.image}
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
                    {editingProject ? "Edit Project" : "Create New Project"}
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
                      Project Image *
                    </label>
                    <div className="space-y-3">
                      {formData.image && (
                        <img
                          src={formData.image}
                          alt="Preview"
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.image}
                          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                          className="flex-1 px-4 py-2 rounded-lg border border-border bg-background 
                                   focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="Image URL"
                        />
                        <label className="p-2 bg-secondary rounded-lg cursor-pointer hover:bg-accent transition-colors">
                          <Upload size={20} className="text-secondary-foreground" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                               focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Project title"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                               focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      placeholder="Project description"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Category
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

                  {/* Technologies */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Technologies
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={techInput}
                        onChange={(e) => setTechInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTech())}
                        className="flex-1 px-4 py-2 rounded-lg border border-border bg-background 
                                 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Add technology"
                      />
                      <button
                        type="button"
                        onClick={handleAddTech}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg 
                                 hover:bg-accent transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.technologies?.map((tech) => (
                        <span
                          key={tech}
                          className="px-3 py-1 bg-accent text-accent-foreground rounded-full 
                                   text-sm flex items-center gap-2"
                        >
                          {tech}
                          <button
                            type="button"
                            onClick={() => handleRemoveTech(tech)}
                            className="hover:text-destructive"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Link */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Project Link (optional)
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
                    className="w-full bg-cta text-cta-foreground py-3 rounded-lg font-semibold 
                             hover:brightness-105 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    {editingProject ? "Save Changes" : "Create Project"}
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
                  Select a project to edit
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Or create a new project using the button above.
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
