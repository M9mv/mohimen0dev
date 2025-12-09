import { ExternalLink, Sparkles } from "lucide-react";
import { useProjects } from "@/context/ProjectContext";

interface ProjectsTabProps {
  onTitleClick: () => void;
}

const ProjectsTab = ({ onTitleClick }: ProjectsTabProps) => {
  const { projects } = useProjects();

  return (
    <div className="min-h-screen px-6 py-12 pb-28" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block mb-4 animate-bounce-in">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 
            className="text-4xl font-bold text-primary mb-2 cursor-default select-none animate-slide-in"
            onClick={onTitleClick}
          >
            مشاريعي
          </h1>
          <p className="text-muted-foreground animate-slide-in animation-delay-100">
            مجموعة من المشاريع التي أعمل عليها
          </p>
        </div>

        {/* Projects List */}
        <div className="space-y-6">
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="glass-card rounded-2xl p-6 animate-slide-up"
              style={{ animationDelay: `${(index + 1) * 80}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {project.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {project.description}
                  </p>
                  
                  {/* Open Project Button */}
                  <a
                    href={project.link || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-primary text-primary font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                  >
                    <ExternalLink size={16} />
                    فتح المشروع
                  </a>
                </div>

                {/* Decorative Element */}
                <div className="hidden sm:block">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent/50 to-secondary flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {projects.length === 0 && (
            <div className="text-center py-12 text-muted-foreground animate-fade-in">
              لا توجد مشاريع حالياً
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectsTab;
