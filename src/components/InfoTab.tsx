import { Instagram, Send } from "lucide-react";
import profileAvatar from "@/assets/profile-avatar.png";

const InfoTab = () => {
  const socialLinks = [
    {
      name: "Instagram @Mqw_c",
      icon: Instagram,
      url: "https://instagram.com/Mqw_c",
    },
    {
      name: "Telegram @M_lq3",
      icon: Send,
      url: "https://t.me/M_lq3",
    },
  ];

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

          <div className="space-y-4">
            {socialLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl glass-card hover:shadow-lg transition-all duration-200 group animate-slide-up"
                  style={{ animationDelay: `${(index + 4) * 80}ms` }}
                >
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                    <Icon size={20} />
                  </div>
                  <span className="font-medium text-foreground">
                    {link.name}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoTab;
