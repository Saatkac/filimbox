import Navbar from "@/components/Navbar";

const SkeletonCard = () => (
  <div className="space-y-2" aria-hidden="true">
    <div className="aspect-[2/3] rounded-lg bg-muted animate-pulse" />
    <div className="h-3 rounded bg-muted animate-pulse w-3/4" />
    <div className="h-3 rounded bg-muted animate-pulse w-1/2" />
  </div>
);

export const ContentGridSkeleton = ({ count = 12 }: { count?: number }) => (
  <div
    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6"
    role="status"
    aria-label="İçerikler yükleniyor"
  >
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
    <span className="sr-only">Yükleniyor…</span>
  </div>
);

export const HomeSkeleton = () => (
  <div className="min-h-dvh bg-cinema-dark">
    <Navbar />
    <div className="h-[50vh] sm:h-[60vh] md:h-[70vh] mt-14 sm:mt-16 bg-gradient-to-br from-muted via-card to-background animate-pulse" />
    <section className="container mx-auto px-3 sm:px-4 pb-16 pt-6">
      <div className="h-6 w-40 bg-muted rounded mb-6 animate-pulse" />
      <ContentGridSkeleton />
    </section>
  </div>
);

export const PageSkeleton = () => (
  <div className="min-h-dvh bg-cinema-dark">
    <Navbar />
    <div className="container mx-auto px-4 pt-24 pb-16">
      <ContentGridSkeleton />
    </div>
  </div>
);
