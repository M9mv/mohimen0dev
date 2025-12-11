import { Project } from "@/types/project";

export const initialProjects: Project[] = [
  {
    id: "1",
    title: "E-Commerce Platform",
    description: "A modern e-commerce solution with seamless checkout experience and inventory management.",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop",
    category: "Web Development",
    technologies: ["React", "Node.js", "MongoDB"],
  },
  {
    id: "2",
    title: "Mobile Banking App",
    description: "Secure and intuitive mobile banking application with biometric authentication.",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&h=400&fit=crop",
    category: "Mobile App",
    technologies: ["React Native", "Firebase"],
  },
  {
    id: "3",
    title: "Healthcare Dashboard",
    description: "Comprehensive healthcare analytics dashboard for patient data visualization.",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=600&h=400&fit=crop",
    category: "Dashboard",
    technologies: ["Vue.js", "D3.js", "Python"],
  },
  {
    id: "4",
    title: "AI Content Generator",
    description: "AI-powered content generation tool for marketing and creative writing.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop",
    category: "AI/ML",
    technologies: ["Python", "OpenAI", "FastAPI"],
  },
  {
    id: "5",
    title: "Real Estate Portal",
    description: "Property listing and management platform with virtual tour integration.",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop",
    category: "Web Development",
    technologies: ["Next.js", "PostgreSQL"],
  },
  {
    id: "6",
    title: "Fitness Tracker",
    description: "Comprehensive fitness tracking app with workout plans and progress analytics.",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop",
    category: "Mobile App",
    technologies: ["Flutter", "Firebase"],
  },
  {
    id: "7",
    title: "Notex AI – ملاحظات ذكية بالذكاء الاصطناعي",
    description: "احفظ ونظم ملاحظاتك بسرعة وسهولة مع Notex AI. كل ملاحظاتك النصية مُلخّصة بذكاء ومرتبة بشكل عملي، لتسهيل المراجعة والوصول لأي معلومة في لحظات.",
    image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&h=400&fit=crop",
    category: "AI/ML",
    technologies: ["AI", "React", "Node.js"],
    link: "https://ur.link/Notex",
  },
];

export const categories = ["All", "Web Development", "Mobile App", "Dashboard", "AI/ML"];
