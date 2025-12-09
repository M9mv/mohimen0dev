import { ExternalLink } from "lucide-react";
import { Project } from "@/types/project";

interface ProjectCardProps {
  project: Project;
  index: number;
}

const ProjectCard = ({ project, index }: ProjectCardProps) => {
  return (
    <div
      className="group bg-card rounded-xl overflow-hidden shadow-lg hover:shadow-2xl 
                 transition-all duration-500 hover:-translate-y-2 animate-fade-up opacity-0"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="relative overflow-hidden h-48 md:h-56">
        <img
          src={project.image}
          alt={project.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
          <div className="p-4 text-primary-foreground">
            <span className="text-sm font-medium">{project.category}</span>
          </div>
        </div>
      </div>
      
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-primary group-hover:text-accent-foreground transition-colors">
            {project.title}
          </h3>
          {project.link && (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink size={18} />
            </a>
          )}
        </div>
        
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {project.description}
        </p>
        
        {project.technologies && project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {project.technologies.slice(0, 3).map((tech) => (
              <span
                key={tech}
                className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-md font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;
