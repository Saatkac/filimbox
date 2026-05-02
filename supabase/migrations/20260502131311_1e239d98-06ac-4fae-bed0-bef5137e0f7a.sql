UPDATE public.admin_settings SET setting_value = true WHERE setting_key = 'proxy_enabled';
UPDATE public.admin_text_settings SET setting_value = 'builtin' WHERE setting_key = 'proxy_method';