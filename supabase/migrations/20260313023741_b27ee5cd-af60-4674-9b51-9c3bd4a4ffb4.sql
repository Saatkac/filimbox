
-- Add proxy_method setting (builtin, custom_php, custom_node, cloudflare_worker, disabled)
INSERT INTO public.admin_settings (setting_key, setting_value, description)
VALUES ('proxy_method', true, 'Proxy yöntemi: builtin=Dahili Supabase, custom=Özel URL')
ON CONFLICT (setting_key) DO NOTHING;

-- Create a text-based settings table for non-boolean settings
CREATE TABLE IF NOT EXISTS public.admin_text_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL DEFAULT '',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_text_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read text settings
CREATE POLICY "Anyone can view text settings" ON public.admin_text_settings
  FOR SELECT TO public USING (true);

-- Only admins can insert
CREATE POLICY "Only admins can insert text settings" ON public.admin_text_settings
  FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "Only admins can update text settings" ON public.admin_text_settings
  FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Only admins can delete text settings" ON public.admin_text_settings
  FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default proxy settings
INSERT INTO public.admin_text_settings (setting_key, setting_value, description)
VALUES 
  ('proxy_method', 'builtin', 'Aktif proxy yöntemi: builtin, custom_php, custom_node, cloudflare_worker, disabled'),
  ('proxy_custom_php_url', '', 'Özel PHP proxy URL (örn: https://mysite.com/proxy.php?url=)'),
  ('proxy_custom_node_url', '', 'Özel Node.js proxy URL (örn: https://mysite.com/proxy?url=)'),
  ('proxy_cloudflare_worker_url', '', 'Cloudflare Worker proxy URL (örn: https://proxy.workers.dev/?url=)')
ON CONFLICT (setting_key) DO NOTHING;
