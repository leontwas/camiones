import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthProvider } from '@/src/context/AuthContext';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Rutas de Gestión CRUD */}
        <Stack.Screen
          name="gestionarChoferes"
          options={{
            title: 'Gestionar Choferes',
            headerShown: true,
            headerBackTitle: 'Atrás',
          }}
        />
        <Stack.Screen
          name="gestionarTractores"
          options={{
            title: 'Gestionar Tractores',
            headerShown: true,
            headerBackTitle: 'Atrás',
          }}
        />
        <Stack.Screen
          name="gestionarBateas"
          options={{
            title: 'Gestionar Bateas',
            headerShown: true,
            headerBackTitle: 'Atrás',
          }}
        />
        <Stack.Screen
          name="asignacionViajes"
          options={{
            title: 'Asignación de Viajes',
            headerShown: true,
            headerBackTitle: 'Atrás',
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
    </AuthProvider>
  );
}