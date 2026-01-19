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

interface AdminSettingsContextType {
  settings: AdminSettings;
  loading: boolean;
  updateSetting: (key: keyof AdminSettings, value: boolean) => Promise<void>;
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

const AdminSettingsContext = createContext<AdminSettingsContextType | undefined>(undefined);

export const AdminSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value');

      if (error) {
        console.error('Error fetching settings:', error);
        return;
      }

      if (data) {
        const newSettings = { ...defaultSettings };
        data.forEach((row: { setting_key: string; setting_value: boolean }) => {
          if (row.setting_key in newSettings) {
            (newSettings as any)[row.setting_key] = row.setting_value;
          }
        });
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof AdminSettings, value: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_settings')
        .update({ setting_value: value })
        .eq('setting_key', key);

      if (error) {
        console.error('Error updating setting:', error);
        throw error;
      }

      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <AdminSettingsContext.Provider value={{ 
      settings, 
      loading, 
      updateSetting, 
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
