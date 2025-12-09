import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/context/ProjectContext";
import ProjectCard from "./ProjectCard";
import { categories } from "@/data/projects";

const ProjectsSection = () => {
  const { projects } = useProjects();
  const [activeFilter, setActiveFilter] = useState("All");
  const navigate = useNavigate();
  
  // Hidden admin access - track rapid clicks
  const clickCountRef = useRef(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleTitleClick = useCallback(() => {
    clickCountRef.current += 1;
    
    // Clear existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    
    // If 5 clicks reached, navigate to admin
    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      navigate("/admin");
      return;
    }
    
    // Reset clicks after 2 seconds
    clickTimeoutRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 2000);
  }, [navigate]);

  const filteredProjects = activeFilter === "All"
    ? projects
    : projects.filter((project) => project.category === activeFilter);

  return (
    <section id="projects" className="py-20 md:py-32 relative">
      {/* Decorative elements */}
      <div className="blue-square w-28 h-28 top-20 right-10 animate-float opacity-20" />
      <div className="blue-square w-16 h-16 bottom-40 left-20 animate-float delay-300 opacity-25" />
      <div className="decorative-line w-px h-40 top-40 left-1/4 rotate-6" />

      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 
            className="section-title cursor-pointer select-none"
            onClick={handleTitleClick}
          >
            Explore My Projects
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A collection of my recent work, showcasing creativity and technical expertise
            across various domains.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveFilter(category)}
              className={`px-5 py-2 rounded-full font-medium text-sm transition-all duration-300 ${
                activeFilter === category
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Projects grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filteredProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              No projects found in this category.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProjectsSection;
