// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // The package root throws in Expo Go on Android (push side effect). See src/services/notificationsApi.ts.
    ignores: ['src/services/notificationsApi.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'expo-notifications', message: "Import from '@/services/notificationsApi' (root import crashes Expo Go)." },
          ],
        },
      ],
    },
  },
]);
