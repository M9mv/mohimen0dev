import { Instagram, Send } from "lucide-react";

const InfoTab = () => {
  const socialLinks = [
    {
      name: "Instagram",
      icon: Instagram,
      url: "#", // سيتم إضافة الرابط لاحقاً
      placeholder: true,
    },
    {
      name: "Telegram",
      icon: Send,
      url: "#", // سيتم إضافة الرابط لاحقاً
      placeholder: true,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-12 pb-28" dir="rtl">
      <div className="w-full max-w-md mx-auto">
        {/* Profile Section */}
        <div className="text-center mb-10 animate-fade-up">
          {/* Avatar */}
          <div className="relative w-40 h-40 mx-auto mb-6">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center overflow-hidden border-4 border-card shadow-xl">
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=mohimen&backgroundColor=b6e3f4"
                alt="mohimen avatar"
                className="w-32 h-32"
              />
            </div>
          </div>

          {/* Name and Bio */}
          <h2 className="text-2xl font-bold text-foreground mb-2">
            mohimen
          </h2>
          <p className="text-muted-foreground text-sm">
            👾 Beginner programmer | 🎮 Gamer
          </p>
        </div>

        {/* Contact Section */}
        <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
          <h3 className="text-xl font-bold text-primary text-center mb-6">
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
                  className="flex items-center gap-4 p-4 rounded-xl glass-card hover:shadow-lg transition-all duration-300 group"
                  style={{ animationDelay: `${(index + 1) * 100}ms` }}
                >
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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
