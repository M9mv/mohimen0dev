import { Project } from "@/types/project";

export const initialProjects: Project[] = [
  {
    id: "1",
    title: "Notex AI – ملاحظات ذكية بالذكاء الاصطناعي",
    description: "احفظ ونظم ملاحظاتك بسرعة وسهولة مع Notex AI. كل ملاحظاتك النصية مُلخّصة بذكاء ومرتبة بشكل عملي، لتسهيل المراجعة والوصول لأي معلومة في لحظات.",
    image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&h=400&fit=crop",
    category: "AI/ML",
    technologies: ["AI", "React", "Node.js"],
    link: "https://ur.link/Notex",
  },
  {
    id: "2",
    title: "Quzaty Bot – تلخيص الملاحظات الذكي",
    description: "بوت لتلخيص النصوص، PDF والصور بسرعة وسهولة",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop",
    category: "AI/ML",
    technologies: ["Python", "Telegram API", "AI"],
    link: "https://t.me/Quzaty_bot",
  },
];

export const categories = ["All", "AI/ML"];
