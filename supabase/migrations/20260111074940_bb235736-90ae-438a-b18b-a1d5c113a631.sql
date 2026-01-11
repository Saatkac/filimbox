-- Add skip controls setting
INSERT INTO public.admin_settings (setting_key, setting_value, description)
VALUES ('skip_controls_enabled', true, '5 saniye ileri/geri alma özelliği')
ON CONFLICT (setting_key) DO NOTHING;