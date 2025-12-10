import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomeTab from "@/components/HomeTab";
import ProjectsTab from "@/components/ProjectsTab";
import InfoTab from "@/components/InfoTab";

type TabType = "home" | "projects" | "info";

const defaultSocialLinks = {
  instagram: "m1w_c",
  telegram: "M_lq3",
};

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [isAnimating, setIsAnimating] = useState(false);
  const [socialLinks, setSocialLinks] = useState(defaultSocialLinks);
  const navigate = useNavigate();
  
  // Load social links from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("mohimen-social-links");
    if (saved) {
      setSocialLinks(JSON.parse(saved));
    }
  }, []);

  // Hidden admin access
  const clickCountRef = useRef(0);
  const lastClickTimeRef = useRef(0);

  const handleTitleClick = () => {
    const now = Date.now();
    
    if (now - lastClickTimeRef.current > 2000) {
      clickCountRef.current = 0;
    }
    
    clickCountRef.current++;
    lastClickTimeRef.current = now;
    
    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      navigate("/admin");
    }
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab || isAnimating) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsAnimating(false);
    }, 150);
  };

  const handleViewProjects = () => {
    handleTabChange("projects");
  };

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Content with smooth transitions */}
      <main 
        className={`transition-all duration-300 ease-out ${
          isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {activeTab === "home" && (
          <HomeTab onViewProjects={handleViewProjects} onTitleClick={handleTitleClick} />
        )}
        {activeTab === "projects" && <ProjectsTab onTitleClick={handleTitleClick} />}
        {activeTab === "info" && <InfoTab socialLinks={socialLinks} />}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Index;
