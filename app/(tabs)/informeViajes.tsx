import { InformeViajesScreen } from '@/src/screen/InformeViajesScreen';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

export default function ProtectedInformeViajesScreen() {
  return (
    <ProtectedRoute>
      <InformeViajesScreen />
    </ProtectedRoute>
  );
}