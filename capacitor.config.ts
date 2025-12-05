import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.83c9252644494c65ac44d79abbab0ec2',
  appName: 'filimbox',
  webDir: 'dist',
  server: {
    url: 'https://83c92526-4449-4c65-ac44-d79abbab0ec2.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
