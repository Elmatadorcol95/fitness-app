const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getUniqueIdentifier = () => {
  if (IS_DEV) return 'com.elmatadorcol95.vulcan.dev';
  if (IS_PREVIEW) return 'com.elmatadorcol95.vulcan.preview';
  return 'com.elmatadorcol95.vulcan';
};

const getAppName = () => {
  if (IS_DEV) return 'Vulcan Dev';
  if (IS_PREVIEW) return 'Vulcan Preview';
  return 'Vulcan';
};

export default {
  expo: {
    name: getAppName(),
    slug: 'fitness-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'vulcan',
    userInterfaceStyle: 'dark',
    ios: {
      icon: './assets/images/icon.png',
      bundleIdentifier: getUniqueIdentifier(),
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#141A17',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      package: getUniqueIdentifier(),
      permissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      ],
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      ['expo-splash-screen', {
        backgroundColor: '#141A17',
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        android: { image: './assets/images/splash-icon.png', imageWidth: 200 },
      }],
      'expo-sqlite',
      'expo-secure-store',
      ['expo-image-picker', {
        photosPermission: 'Vulcan necesita acceso a tus fotos para las fotos de progreso.',
        cameraPermission: 'Vulcan necesita acceso a la cámara para las fotos de progreso.',
      }],
      'expo-image',
      'expo-sharing',
      'expo-audio',
      'expo-notifications',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: { projectId: '8faa514c-6cb3-4590-999a-db65361f9c57' },
    },
    runtimeVersion: { policy: 'appVersion' },
    updates: { url: 'https://u.expo.dev/8faa514c-6cb3-4590-999a-db65361f9c57' },
  },
};
