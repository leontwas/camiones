import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/context/AuthContext';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import 'react-native-reanimated';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#999',
          headerShown: true,
          headerTintColor: '#007AFF',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarLabel: 'Inicio',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
            headerTitle: 'Inicio',
          }}
        />

        <Tabs.Screen
          name="gestionar"
          options={{
            title: isAdmin ? 'Panel de Gestión' : 'Historial Personal',
            tabBarLabel: isAdmin ? 'Gestionar' : 'Ver historial Personal',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>,
            headerTitle: isAdmin ? 'Panel de Gestión' : 'Historial Personal',
          }}
        />

        <Tabs.Screen
          name="informeViajes"
          options={{
            title: isAdmin ? 'Informe de Viajes' : 'Estado de Viajes',
            tabBarLabel: isAdmin ? 'Informes' : 'Estado de viajes',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📊</Text>,
            headerTitle: isAdmin ? 'Informe de Viajes' : 'Estado de Viajes',
          }}
        />

        <Tabs.Screen
          name="login"
          options={{
            title: 'Perfil',
            tabBarLabel: 'Perfil',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
            headerTitle: isAdmin ? 'Perfil de Administrador' : 'Perfil de Chofer',
          }}
        />
      </Tabs>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}