-- Admin settings table for feature toggles
CREATE TABLE public.admin_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key text NOT NULL UNIQUE,
    setting_value boolean NOT NULL DEFAULT true,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view settings"
ON public.admin_settings
FOR SELECT
USING (true);

-- Only admins can modify settings
CREATE POLICY "Only admins can update settings"
ON public.admin_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert settings"
ON public.admin_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete settings"
ON public.admin_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.admin_settings (setting_key, setting_value, description) VALUES
('quality_selector_enabled', true, 'Video kalite seçimi özelliği'),
('playback_speed_enabled', true, 'Oynatma hızı değiştirme özelliği'),
('comments_enabled', true, 'Yorum sistemi özelliği'),
('favorites_enabled', true, 'Favorilere ekleme özelliği');