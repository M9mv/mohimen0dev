import { ArrowLeft } from "lucide-react";

interface HomeTabProps {
  onViewProjects: () => void;
}

const HomeTab = ({ onViewProjects }: HomeTabProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-24" dir="rtl">
      <div className="text-center animate-fade-up">
        {/* Welcome Text */}
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
          مرحباً بك
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          أنا مبرمج مبتدئ أستكشف عالم البرمجة
        </p>

        {/* Profile Avatar */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center overflow-hidden border-4 border-card shadow-xl">
            <img 
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=mohimen&backgroundColor=b6e3f4"
              alt="mohimen avatar"
              className="w-36 h-36"
            />
          </div>
        </div>

        {/* Name and Bio */}
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          mohimen
        </h2>
        <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-md mx-auto leading-relaxed">
          👾 Beginner programmer | 🎮 Gamer | 
          <br />
          Exploring the code and game worlds!
        </p>

        {/* CTA Button */}
        <button
          onClick={onViewProjects}
          className="cta-button inline-flex items-center gap-2 text-lg"
        >
          <ArrowLeft size={20} />
          عرض المشاريع
        </button>
      </div>
    </div>
  );
};

export default HomeTab;
