import { Home, FolderOpen, User, ShoppingBag } from "lucide-react";

interface BottomNavProps {
  activeTab: "home" | "projects" | "store" | "info";
  onTabChange: (tab: "home" | "projects" | "store" | "info") => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const tabs = [
    { id: "info" as const, label: "معلومات", icon: User },
    { id: "store" as const, label: "المتجر", icon: ShoppingBag },
    { id: "projects" as const, label: "المشاريع", icon: FolderOpen },
    { id: "home" as const, label: "الرئيسية", icon: Home },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-nav flex items-center gap-2 px-4 py-3 rounded-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                isActive
                  ? "bg-cta text-cta-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={20} />
              <span className={`text-sm font-medium ${isActive ? "block" : "hidden sm:block"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
