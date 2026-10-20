import type {ExpoConfig} from 'expo/config';
import project from './project.config.json';
const projectId = process.env.EAS_PROJECT_ID || project.easProjectId;
const config: ExpoConfig = {
  name: 'Mus’haf Scan', slug: 'mushaf-scan', version: '1.0.0', orientation: 'portrait',
  scheme: 'mushafscan', userInterfaceStyle: 'light', icon: './assets/icon.png',
  ios: {supportsTablet:true, bundleIdentifier:'com.samimustafa.mushafscan', infoPlist:{ITSAppUsesNonExemptEncryption:false}},
  android:{package:'com.samimustafa.mushafscan',adaptiveIcon:{foregroundImage:'./assets/adaptive-icon.png',backgroundColor:'#294E42'}},
  plugins:[['expo-image-picker',{photosPermission:'Lejo Mus’haf Scan të hapë fotografinë e faqes së Kuranit.',cameraPermission:'Lejo Mus’haf Scan të fotografojë faqen e Kuranit.',microphonePermission:false}]],
  runtimeVersion:{policy:'fingerprint'},
  updates:{enabled:!!projectId,checkAutomatically:'NEVER',fallbackToCacheTimeout:0,...(projectId?{url:`https://u.expo.dev/${projectId}`}:{})},
  extra:projectId?{eas:{projectId}}:{},
};
export default config;
