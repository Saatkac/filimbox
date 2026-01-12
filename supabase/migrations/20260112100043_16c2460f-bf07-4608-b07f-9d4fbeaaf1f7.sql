-- Admin'in öne çıkan film seçebilmesi için ayar ekle
INSERT INTO admin_settings (setting_key, setting_value, description)
VALUES ('featured_movie_id', false, 'Öne çıkan film ID (null ise en son eklenen)')
ON CONFLICT (setting_key) DO NOTHING;

-- Öne çıkan film ID'sini saklamak için yeni tablo
CREATE TABLE IF NOT EXISTS public.featured_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id uuid REFERENCES public.movies(id) ON DELETE SET NULL,
  series_id uuid REFERENCES public.series(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.featured_content ENABLE ROW LEVEL SECURITY;

-- Anyone can view featured content
CREATE POLICY "Anyone can view featured content" 
ON public.featured_content 
FOR SELECT 
USING (true);

-- Only admins can modify featured content
CREATE POLICY "Only admins can insert featured content" 
ON public.featured_content 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update featured content" 
ON public.featured_content 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete featured content" 
ON public.featured_content 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default row
INSERT INTO public.featured_content (id) VALUES (gen_random_uuid());

-- Add trigger for updated_at
CREATE TRIGGER update_featured_content_updated_at
BEFORE UPDATE ON public.featured_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();