import { ArrowDown } from "lucide-react";

const HeroSection = () => {
  const scrollToProjects = () => {
    const element = document.querySelector("#projects");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="home"
      className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20"
    >
      {/* Decorative Elements */}
      <div className="blue-square w-32 h-32 top-32 left-10 animate-float opacity-40" />
      <div className="blue-square w-24 h-24 top-48 right-20 animate-float delay-200 opacity-30" />
      <div className="blue-square w-40 h-40 bottom-32 left-1/4 animate-float delay-400 opacity-25" />
      <div className="blue-square w-20 h-20 bottom-48 right-1/3 animate-float delay-300 opacity-35" />
      
      {/* Semi-transparent lines */}
      <div className="decorative-line w-px h-64 top-20 left-1/4 rotate-12" />
      <div className="decorative-line w-px h-48 top-32 right-1/3 -rotate-6" />
      <div className="decorative-line w-96 h-px bottom-40 left-10 rotate-3" />

      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          <p className="text-muted-foreground text-lg md:text-xl mb-4 animate-fade-up opacity-0">
            Hello, I'm
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-primary mb-6 animate-fade-up opacity-0 delay-100">
            Mohim
          </h1>
          <p className="text-xl md:text-2xl text-foreground/80 mb-4 animate-fade-up opacity-0 delay-200">
            Creative Developer & Designer
          </p>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-10 animate-fade-up opacity-0 delay-300">
            I craft beautiful, functional digital experiences that bring ideas to life. 
            Specializing in modern web development and intuitive user interfaces.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up opacity-0 delay-400">
            <button
              onClick={scrollToProjects}
              className="cta-button inline-flex items-center justify-center gap-2"
            >
              View My Work
              <ArrowDown size={18} />
            </button>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-8 py-3 rounded-lg border-2 border-primary text-primary font-semibold 
                         hover:bg-primary hover:text-primary-foreground transition-all duration-300"
            >
              Contact Me
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-primary/50 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-primary/50 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
