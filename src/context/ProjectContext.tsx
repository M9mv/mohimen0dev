import React, { createContext, useContext, useState, useEffect } from "react";
import { Project } from "@/types/project";
import { initialProjects } from "@/data/projects";

interface ProjectContextType {
  projects: Project[];
  addProject: (project: Omit<Project, "id">) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem("mohim-projects");
    return saved ? JSON.parse(saved) : initialProjects;
  });

  useEffect(() => {
    localStorage.setItem("mohim-projects", JSON.stringify(projects));
  }, [projects]);

  const addProject = (project: Omit<Project, "id">) => {
    const newProject: Project = {
      ...project,
      id: Date.now().toString(),
    };
    setProjects((prev) => [...prev, newProject]);
  };

  const updateProject = (id: string, updatedFields: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === id ? { ...project, ...updatedFields } : project
      )
    );
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
  };

  return (
    <ProjectContext.Provider value={{ projects, addProject, updateProject, deleteProject }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectProvider");
  }
  return context;
};
