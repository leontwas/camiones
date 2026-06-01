import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import apiClient, { choferesAPI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateToLogin }) => {
  const { login } = useAuth();
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [cuil, setCuil] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleRegister = async () => {
    // Validaciones (CUIL es ahora opcional)
    if (!nombreCompleto.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      showAlert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    if (cuil.trim() && cuil.trim().length < 8) {
      showAlert('Error', 'Por favor ingresa un CUIL válido');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      showAlert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Validar email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showAlert('Error', 'Por favor ingresa un email válido');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        nombre_completo: nombreCompleto.trim(),
        email: email.trim().toLowerCase(),
        password: password,
      };

      const response = await apiClient.post('/api/v1/auth/register', payload);

      const { access_token, user } = response.data;

      if (!access_token) {
        throw new Error('No se recibió token del servidor');
      }

      // Auto-login después del registro
      await login(access_token);

      // Si el usuario ingresó un CUIL y tenemos el chofer_id, actualizar el CUIL en la base de datos
      const choferId = user?.chofer_id;
      if (cuil.trim() && choferId) {
        try {
          const cuilParsed = parseInt(cuil.trim(), 10);
          await choferesAPI.actualizar(choferId, { cuil: isNaN(cuilParsed) ? cuil.trim() : cuilParsed });
          console.log('CUIL actualizado exitosamente para el chofer:', choferId);
        } catch (updateError) {
          console.error('Error al actualizar el CUIL del chofer:', updateError);
        }
      }

      showAlert('Éxito', 'Registro completado exitosamente');
    } catch (error: any) {
      console.error('Error en registro:', error);

      if (error.response) {
        const errorMessage = error.response.data?.message;
        const displayMessage = Array.isArray(errorMessage)
          ? errorMessage.join('\n')
          : errorMessage || 'Error al registrar usuario. Intenta nuevamente.';

        showAlert('Error de registro', displayMessage);
      } else if (error.request) {
        showAlert('Error de conexión', 'No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      } else {
        showAlert('Error', error.message || 'Ocurrió un error inesperado');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🚛</Text>
          <Text style={styles.title}>Sistema de Transporte</Text>
          <Text style={styles.subtitle}>Registro de Chofer</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nombre Completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Juan Pérez González"
              placeholderTextColor="#666"
              value={nombreCompleto}
              onChangeText={setNombreCompleto}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>CUIL (Opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 20123456789"
              placeholderTextColor="#666"
              value={cuil}
              onChangeText={setCuil}
              keyboardType="numeric"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="tu-email@ejemplo.com"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Repite tu contraseña"
              placeholderTextColor="#666"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              onSubmitEditing={handleRegister}
            />
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Registrarse</Text>
            )}
          </TouchableOpacity>

          <View style={styles.linkContainer}>
            <Text style={styles.linkQuestion}>¿Ya estás registrado?</Text>
            <TouchableOpacity onPress={onNavigateToLogin} disabled={loading}>
              <Text style={styles.linkText}>Inicia Sesión</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Al registrarte, se creará tu cuenta de chofer. Un administrador deberá asignarte
              un tractor y batea antes de que puedas empezar a trabajar.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  registerButton: {
    backgroundColor: '#34C759',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  linkQuestion: {
    fontSize: 14,
    color: '#666',
  },
  linkText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 18,
  },
});