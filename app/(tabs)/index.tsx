import { AsignacionViajesScreen } from '@/src/screen/AsignacionViajesScreen';
import { ChoferEstadoScreen } from '@/src/screen/ChoferEstadoScreen';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';
import { useAuth } from '@/src/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function ProtectedViajesScreen() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Si es chofer, mostrar la pantalla de Estado
  if (user?.rol === 'chofer') {
    return <ChoferEstadoScreen />;
  }

  // Si es admin, mostrar la pantalla de Asignación de Viajes (protegida)
  return (
    <ProtectedRoute>
      <AsignacionViajesScreen />
    </ProtectedRoute>
  );
}