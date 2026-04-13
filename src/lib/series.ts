export type DragonBallSeries = {
  id: string;
  name: string;
  subtitle: string;
  slug: string;
  coverSrc: string;
  coverLabel: string;
  coverHint: string;
  metaDescription: string;
  imageAlt: string;
};

export const dragonBallSeries: DragonBallSeries[] = [
  {
    id: "dragon-ball",
    name: "دراغون بول",
    subtitle: "البداية الكلاسيكية",
    slug: "dragon-ball",
    coverSrc:
      "https://i.ibb.co/4ZG4KPDb/bb2d864e-e8b4-452e-8a34-1b6d7346f5bd-batcheditor-fotor.webp",
    coverLabel: "Dragon Ball",
    coverHint: "غلاف السلسلة",
    metaDescription:
      "ابدأ الرحلة من الجذور مع اختبار دراغون بول الكلاسيكي، حيث المغامرات الأولى، كرات التنين، وأشهر اللحظات التي صنعت أسطورة غوكو.",
    imageAlt:
      "غلاف دراغون بول الكلاسيكي يظهر غوكو الصغير في أجواء المغامرة الأولى",
  },
  {
    id: "dragon-ball-z",
    name: "دراغون بول زد",
    subtitle: "التحولات والمعارك الكبرى",
    slug: "dragon-ball-z",
    coverSrc: "https://i.ibb.co/SXYQYt3s/image.jpg",
    coverLabel: "Dragon Ball Z",
    coverHint: "غلاف السلسلة",
    metaDescription:
      "خض غمار معارك السايان والتحولات الأسطورية في اختبار دراغون بول زد، واكتشف مدى إتقانك لأقوى المواجهات وأشهر الأعداء.",
    imageAlt:
      "غلاف دراغون بول زد يبرز غوكو وأبطال السلسلة وسط أجواء المعارك والتحولات",
  },
  {
    id: "dragon-ball-gt",
    name: "دراغون بول GT",
    subtitle: "رحلة مختلفة",
    slug: "dragon-ball-gt",
    coverSrc: "https://i.ibb.co/6b8K4tN/dragon-ball-gt-cover.png?version=1",
    coverLabel: "Dragon Ball GT",
    coverHint: "غلاف السلسلة",
    metaDescription:
      "انطلق في اختبار دراغون بول GT واسترجع الرحلات الفضائية، الأشرار الغامضين، وتحول السوبر سايان 4 في تجربة مليئة بالحنين.",
    imageAlt:
      "غلاف دراغون بول GT يظهر غوكو ورفاقه خلال الرحلة الكونية وأجواء السوبر سايان 4",
  },
  {
    id: "dragon-ball-super",
    name: "دراغون بول سوبر",
    subtitle: "الأشكال الإلهية",
    slug: "dragon-ball-super",
    coverSrc: "https://i.ibb.co/1sQ7hWk/dragon-ball-super-cover.png?version=1",
    coverLabel: "Dragon Ball Super",
    coverHint: "غلاف السلسلة",
    metaDescription:
      "اختبر معرفتك في دراغون بول سوبر مع بطولات الأكوان، القوى الإلهية، وتحول الغريزة الفائقة في تحدٍ يليق بالمقاتلين الأقوياء.",
    imageAlt:
      "غلاف دراغون بول سوبر يظهر غوكو بهيئة الغريزة الفائقة مع طاقة زرقاء وفضية",
  },
  {
    id: "movies",
    name: "الأفلام",
    subtitle: "اختبارات الأفلام بشكل عام",
    slug: "movies",
    coverSrc: "https://i.ibb.co/y6Q0k0G/movies-cover.png?version=1",
    coverLabel: "Movies",
    coverHint: "غلاف الأفلام",
    metaDescription:
      "استعد لاختبار أفلام دراغون بول الشامل، من الخصوم السينمائيين الأقوى إلى اللحظات الحاسمة التي لا تُنسى على الشاشة الكبيرة.",
    imageAlt:
      "غلاف أفلام دراغون بول يجمع شخصيات بارزة من الأفلام في مشهد قتالي سينمائي",
  },
];
