import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import HomeTab from "@/components/HomeTab";
import ProjectsTab from "@/components/ProjectsTab";
import InfoTab from "@/components/InfoTab";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"home" | "projects" | "info">("home");

  const handleViewProjects = () => {
    setActiveTab("projects");
  };

  return (
    <div className="min-h-screen">
      {/* Content */}
      <main>
        {activeTab === "home" && <HomeTab onViewProjects={handleViewProjects} />}
        {activeTab === "projects" && <ProjectsTab />}
        {activeTab === "info" && <InfoTab />}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
