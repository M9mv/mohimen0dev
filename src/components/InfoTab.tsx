import { Instagram, Send, Mail } from "lucide-react";
import profileAvatar from "@/assets/profile-avatar.jpg";

interface InfoTabProps {
  socialLinks: {
    instagram: string;
    telegram: string;
  };
}

const InfoTab = ({ socialLinks }: InfoTabProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-12 pb-28" dir="rtl">
      <div className="w-full max-w-md mx-auto">
        {/* Profile Section */}
        <div className="text-center mb-10">
          {/* Avatar */}
          <div className="relative w-40 h-40 mx-auto mb-6 animate-scale-in">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center overflow-hidden border-4 border-card shadow-xl">
              <img 
                src={profileAvatar}
                alt="mohimen avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Name and Bio */}
          <h2 className="text-2xl font-bold text-foreground mb-2 animate-slide-in animation-delay-100">
            mohimen
          </h2>
          <p className="text-muted-foreground text-sm animate-slide-in animation-delay-200">
            👾 Beginner programmer | 🎮 Gamer
          </p>
        </div>

        {/* Contact Section */}
        <div>
          <h3 className="text-xl font-bold text-primary text-center mb-6 animate-slide-in animation-delay-300">
            تواصل معي
          </h3>

          <div className="flex justify-center gap-6 animate-slide-up animation-delay-400">
            {/* Email */}
            <a
              href="mailto:mohimen@programmer.net"
              className="w-14 h-14 rounded-full glass-card flex items-center justify-center hover:shadow-lg hover:scale-110 transition-all duration-200 group"
            >
              <Mail size={28} className="text-foreground group-hover:text-primary transition-colors" />
            </a>
            {socialLinks.instagram && (
              <a
                href={`https://instagram.com/${socialLinks.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-14 h-14 rounded-full glass-card flex items-center justify-center hover:shadow-lg hover:scale-110 transition-all duration-200 group"
              >
                <Instagram size={28} className="text-foreground group-hover:text-primary transition-colors" />
              </a>
            )}
            {socialLinks.telegram && (
              <a
                href={`https://t.me/${socialLinks.telegram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-14 h-14 rounded-full glass-card flex items-center justify-center hover:shadow-lg hover:scale-110 transition-all duration-200 group"
              >
                <Send size={28} className="text-foreground group-hover:text-primary transition-colors" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoTab;
