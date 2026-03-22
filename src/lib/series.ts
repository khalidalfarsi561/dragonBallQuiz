export type DragonBallSeries = {
  id: string;
  name: string;
  subtitle: string;
  slug: string;
  coverSrc: string;
  coverLabel: string;
  coverHint: string;
};

export const dragonBallSeries: DragonBallSeries[] = [
  { 
    id: "dragon-ball",
    name: "دراغون بول",
    subtitle: "البداية الكلاسيكية",
    slug: "dragon-ball",
    coverSrc: "https://i.ibb.co/4K9m3yP/dragon-ball-cover.png?version=1",
    coverLabel: "Dragon Ball",
    coverHint: "غلاف السلسلة",
  },
  {
    id: "dragon-ball-z",
    name: "دراغون بول زد",
    subtitle: "التحولات والمعارك الكبرى",
    slug: "dragon-ball-z",
    coverSrc: "https://i.ibb.co/SXYQYt3s/image.jpg",
    coverLabel: "Dragon Ball Z",
    coverHint: "غلاف السلسلة",
  },
  {
    id: "dragon-ball-gt",
    name: "دراغون بول جي تي",
    subtitle: "رحلة مختلفة",
    slug: "dragon-ball-gt",
    coverSrc: "https://i.ibb.co/6b8K4tN/dragon-ball-gt-cover.png?version=1",
    coverLabel: "Dragon Ball GT",
    coverHint: "غلاف السلسلة",
  },
  {
    id: "dragon-ball-super",
    name: "دراغون بول سوبر",
    subtitle: "الأشكال الإلهية",
    slug: "dragon-ball-super",
    coverSrc: "https://i.ibb.co/1sQ7hWk/dragon-ball-super-cover.png?version=1",
    coverLabel: "Dragon Ball Super",
    coverHint: "غلاف السلسلة",
  },
  {
    id: "movies",
    name: "الأفلام",
    subtitle: "اختبارات الأفلام بشكل عام",
    slug: "movies",
    coverSrc: "https://i.ibb.co/y6Q0k0G/movies-cover.png?version=1",
    coverLabel: "Movies",
    coverHint: "غلاف الأفلام",
  },
];
