-- Add proxy_enabled setting to admin_settings
INSERT INTO public.admin_settings (setting_key, setting_value, description)
VALUES ('proxy_enabled', true, 'Video proxy özelliğini aç/kapat')
ON CONFLICT (setting_key) DO NOTHING;