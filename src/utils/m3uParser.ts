export interface ParsedMovie {
  title: string;
  poster_url: string;
  video_url: string;
  category: string;
  year: number | null;
  rating: number;
  duration: string | null;
}

export function parseM3U(content: string): ParsedMovie[] {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  const movies: ParsedMovie[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for #EXTINF lines
    if (line.startsWith('#EXTINF')) {
      // Parse metadata
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/);
      const titleMatch = line.match(/,(.+)$/);
      
      const posterUrl = logoMatch ? logoMatch[1] : '';
      let category = groupMatch ? groupMatch[1].replace(/✨/g, '').trim() : 'Genel';
      const rawTitle = titleMatch ? titleMatch[1].trim() : '';
      
      // Get the video URL from the next line
      let videoUrl = lines[i + 1] || '';
      
      if (!videoUrl || videoUrl.startsWith('#')) continue;
      
      // Fix incomplete URLs - add index.m3u8 if URL ends with /
      if (videoUrl.endsWith('/')) {
        videoUrl = videoUrl + 'index.m3u8';
      }
      
      // Extract year from title
      const yearMatch = rawTitle.match(/\((\d{4})\)/);
      const year = yearMatch ? parseInt(yearMatch[1]) : null;
      
      // Clean title
      let title = rawTitle
        .replace(/\(\d{4}\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Remove extra metadata from title
      const titleParts = title.split('-');
      if (titleParts.length > 1) {
        title = titleParts[0].trim();
      }
      
      // Normalize category
      if (category.includes('ANIMASYON') || category.includes('COCUK')) {
        category = 'Animasyon';
      } else if (category.includes('AKSİYON') || category.includes('AKSIYON')) {
        category = 'Aksiyon';
      } else if (category.includes('KORKU') || category.includes('GERİLİM')) {
        category = 'Korku';
      } else if (category.includes('KOMEDİ') || category.includes('KOMEDI')) {
        category = 'Komedi';
      } else if (category.includes('DRAM')) {
        category = 'Dram';
      } else if (category.includes('BİLİM KURGU') || category.includes('BILIM KURGU')) {
        category = 'Bilim Kurgu';
      } else if (category.includes('ROMANTIK')) {
        category = 'Romantik';
      } else if (category.includes('MACERA')) {
        category = 'Macera';
      }
      
      movies.push({
        title,
        poster_url: posterUrl,
        video_url: videoUrl,
        category,
        year,
        rating: 7.0, // Default rating
        duration: null,
      });
      
      i++; // Skip the video URL line
    }
  }
  
  return movies;
}
