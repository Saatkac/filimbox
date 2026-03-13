import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminSettings {
  quality_selector_enabled: boolean;
  playback_speed_enabled: boolean;
  comments_enabled: boolean;
  favorites_enabled: boolean;
  skip_controls_enabled: boolean;
  requests_enabled: boolean;
  proxy_enabled: boolean;
}

interface TextSettings {
  proxy_method: string; // builtin, custom_php, custom_node, cloudflare_worker, disabled
  proxy_custom_php_url: string;
  proxy_custom_node_url: string;
  proxy_cloudflare_worker_url: string;
}

interface AdminSettingsContextType {
  settings: AdminSettings;
  textSettings: TextSettings;
  loading: boolean;
  updateSetting: (key: keyof AdminSettings, value: boolean) => Promise<void>;
  updateTextSetting: (key: keyof TextSettings, value: string) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: AdminSettings = {
  quality_selector_enabled: true,
  playback_speed_enabled: true,
  comments_enabled: true,
  favorites_enabled: true,
  skip_controls_enabled: true,
  requests_enabled: true,
  proxy_enabled: true,
};

const defaultTextSettings: TextSettings = {
  proxy_method: 'builtin',
  proxy_custom_php_url: '',
  proxy_custom_node_url: '',
  proxy_cloudflare_worker_url: '',
};

const AdminSettingsContext = createContext<AdminSettingsContextType | undefined>(undefined);

export const AdminSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const [textSettings, setTextSettings] = useState<TextSettings>(defaultTextSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const [{ data: boolData, error: boolError }, { data: textData, error: textError }] = await Promise.all([
        supabase.from('admin_settings').select('setting_key, setting_value'),
        supabase.from('admin_text_settings' as any).select('setting_key, setting_value'),
      ]);

      if (!boolError && boolData) {
        const newSettings = { ...defaultSettings };
        boolData.forEach((row: { setting_key: string; setting_value: boolean }) => {
          if (row.setting_key in newSettings) {
            (newSettings as any)[row.setting_key] = row.setting_value;
          }
        });
        setSettings(newSettings);
      }

      if (!textError && textData) {
        const newTextSettings = { ...defaultTextSettings };
        (textData as any[]).forEach((row: { setting_key: string; setting_value: string }) => {
          if (row.setting_key in newTextSettings) {
            (newTextSettings as any)[row.setting_key] = row.setting_value;
          }
        });
        setTextSettings(newTextSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof AdminSettings, value: boolean) => {
    const { error } = await supabase
      .from('admin_settings')
      .update({ setting_value: value })
      .eq('setting_key', key);

    if (error) throw error;
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateTextSetting = async (key: keyof TextSettings, value: string) => {
    const { error } = await (supabase as any)
      .from('admin_text_settings')
      .update({ setting_value: value })
      .eq('setting_key', key);

    if (error) throw error;
    setTextSettings(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <AdminSettingsContext.Provider value={{ 
      settings, 
      textSettings,
      loading, 
      updateSetting, 
      updateTextSetting,
      refreshSettings: fetchSettings 
    }}>
      {children}
    </AdminSettingsContext.Provider>
  );
};

export const useAdminSettings = () => {
  const context = useContext(AdminSettingsContext);
  if (context === undefined) {
    throw new Error('useAdminSettings must be used within an AdminSettingsProvider');
  }
  return context;
};
