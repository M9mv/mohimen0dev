import { ArrowLeft } from "lucide-react";
import profileAvatar from "@/assets/profile-avatar.jpg";

interface HomeTabProps {
  onViewProjects: () => void;
  onTitleClick: () => void;
}

const HomeTab = ({ onViewProjects, onTitleClick }: HomeTabProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-24" dir="rtl">
      <div className="text-center">
        {/* Welcome Text */}
        <h1 
          className="text-4xl md:text-5xl font-bold text-primary mb-4 cursor-default select-none animate-slide-in"
          onClick={onTitleClick}
        >
          مرحباً بك
        </h1>
        <p className="text-muted-foreground text-lg mb-8 animate-slide-in animation-delay-100">
          أنا مبرمج مبتدئ أستكشف عالم البرمجة
        </p>

        {/* Profile Avatar */}
        <div className="relative w-48 h-48 mx-auto mb-8 animate-scale-in animation-delay-200">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center overflow-hidden border-4 border-card shadow-xl">
            <img 
              src={profileAvatar}
              alt="mohimen avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Name and Bio */}
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 animate-slide-in animation-delay-300">
          mohimen
        </h2>
        <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-md mx-auto leading-relaxed animate-slide-in animation-delay-400">
          👾 Beginner programmer | 🎮 Gamer | 
          <br />
          Exploring the code and game worlds!
        </p>

        {/* CTA Button */}
        <button
          onClick={onViewProjects}
          className="cta-button inline-flex items-center gap-2 text-lg animate-slide-in animation-delay-500"
        >
          <ArrowLeft size={20} />
          عرض المشاريع
        </button>
      </div>
    </div>
  );
};

export default HomeTab;
