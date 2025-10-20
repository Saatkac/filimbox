export interface Movie {
  id: string;
  title: string;
  description: string;
  poster: string;
  backdrop: string;
  rating: number;
  year: number;
  category: string;
  duration: string;
  videoUrl: string;
  trailer?: string;
}

// Mock data for demonstration
export const movies: Movie[] = [
  {
    id: "1",
    title: "Galaktik Yolculuk",
    description: "Uzayın derinliklerinde geçen epik bir macera. İnsanlık, yeni bir yuva aramak için yıldızlara doğru yola çıkar.",
    poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop",
    backdrop: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1920&h=1080&fit=crop",
    rating: 8.7,
    year: 2024,
    category: "Bilim Kurgu",
    duration: "2s 25dk",
    videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: "2",
    title: "Karanlık Şehir",
    description: "Suç dolu sokaklarda adalet arayan bir dedektifin hikayesi. Gerçek, göründüğünden çok daha karanlık.",
    poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop",
    backdrop: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&h=1080&fit=crop",
    rating: 9.1,
    year: 2023,
    category: "Gerilim",
    duration: "2s 10dk",
    videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: "3",
    title: "Aşkın Renkleri",
    description: "Farklı dünyalardan iki insanın, engellere rağmen aşk için verdikleri mücadele.",
    poster: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&h=600&fit=crop",
    backdrop: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=1920&h=1080&fit=crop",
    rating: 7.8,
    year: 2024,
    category: "Romantik",
    duration: "1s 55dk",
    videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: "4",
    title: "Savaşçının İntikamı",
    description: "Ailesini kaybeden bir savaşçının intikam yolculuğu. Hızlı dövüş sahneleri ve nefes kesen aksiyonla dolu.",
    poster: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop",
    backdrop: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=1920&h=1080&fit=crop",
    rating: 8.4,
    year: 2023,
    category: "Aksiyon",
    duration: "2s 15dk",
    videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: "5",
    title: "Gizli Oda",
    description: "Eski bir konakta bulunan gizli oda, korkunç sırları açığa çıkarır.",
    poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop",
    backdrop: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&h=1080&fit=crop",
    rating: 7.2,
    year: 2024,
    category: "Korku",
    duration: "1s 40dk",
    videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: "6",
    title: "Komedi Kralı",
    description: "Hayatı altüst olan bir komedyenin, sahneye geri dönüş mücadelesi.",
    poster: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop",
    backdrop: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920&h=1080&fit=crop",
    rating: 7.9,
    year: 2023,
    category: "Komedi",
    duration: "1s 50dk",
    videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: "7",
    title: "Ejderhalar Çağı",
    description: "Mitolojik yaratıkların var olduğu bir dünyada kahramanın yükselişi.",
    poster: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400&h=600&fit=crop",
    backdrop: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=1920&h=1080&fit=crop",
    rating: 8.9,
    year: 2024,
    category: "Fantastik",
    duration: "2s 35dk",
    videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: "8",
    title: "Sessiz Tanık",
    description: "Bir cinayete tanık olan kadının, katilden kaçış mücadelesi.",
    poster: "https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=400&h=600&fit=crop",
    backdrop: "https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=1920&h=1080&fit=crop",
    rating: 8.0,
    year: 2023,
    category: "Gerilim",
    duration: "1s 58dk",
    videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
];

export const categories = [
  "Tümü",
  "Aksiyon",
  "Bilim Kurgu",
  "Romantik",
  "Komedi",
  "Korku",
  "Gerilim",
  "Fantastik",
  "Dram",
];
