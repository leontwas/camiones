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
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

interface LoginScreenProps {
  onNavigateToRegister?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRecovery, setLoadingRecovery] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Conectando...');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    setLoadingMessage('Conectando al servidor...');

    // Cambiar mensaje después de 5 segundos (posible cold start)
    const coldStartTimer = setTimeout(() => {
      if (loading) {
        setLoadingMessage('⏰ Despertando el servidor...\nEsto puede tardar hasta 2 minutos en la primera conexión.\nPor favor, ten paciencia.');
      }
    }, 5000);

    try {
      const response = await apiClient.post('/api/v1/auth/login', {
        email: email.trim().toLowerCase(),
        password: password,
      });

      const { access_token } = response.data;

      if (!access_token) {
        throw new Error('No se recibió token del servidor');
      }

      await login(access_token);
      Alert.alert('Éxito', 'Inicio de sesión exitoso');
    } catch (error: any) {
      // No loggear error completo - solo información relevante

      if (error.response) {
        const errorMessage = error.response.data?.message;
        const displayMessage = Array.isArray(errorMessage)
          ? errorMessage.join('\n')
          : errorMessage || 'Credenciales inválidas. Verifica tu email y contraseña.';

        Alert.alert('Error de autenticación', displayMessage);
      } else if (error.request) {
        // Error de red - puede ser timeout o cold start
        const errorMessage = error.code === 'ECONNABORTED'
          ? 'El servidor tardó demasiado en responder.\n\nEsto puede suceder si el servidor está inactivo. Por favor, intenta nuevamente en unos segundos.'
          : 'No se pudo conectar con el servidor.\n\nVerifica tu conexión a internet e intenta nuevamente.';

        Alert.alert('Error de conexión', errorMessage);
      } else {
        Alert.alert('Error', error.message || 'Ocurrió un error inesperado');
      }
    } finally {
      clearTimeout(coldStartTimer);
      setLoading(false);
      setLoadingMessage('Conectando...');
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email requerido', 'Por favor ingresa tu email para recuperar tu contraseña');
      return;
    }

    setLoadingRecovery(true);
    try {
      await apiClient.post('/api/v1/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });

      Alert.alert(
        'Email enviado',
        'Se ha enviado un correo con tu contraseña a la dirección proporcionada. Revisa tu bandeja de entrada.'
      );
    } catch (error: any) {
      console.error('Error en recuperación:', error);

      if (error.response) {
        const errorMessage = error.response.data?.message;
        const displayMessage = Array.isArray(errorMessage)
          ? errorMessage.join('\n')
          : errorMessage || 'Error al enviar el correo de recuperación. Verifica que el email sea correcto.';

        Alert.alert('Error', displayMessage);
      } else if (error.request) {
        Alert.alert('Error de conexión', 'No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      } else {
        Alert.alert('Error', error.message || 'Ocurrió un error inesperado');
      }
    } finally {
      setLoadingRecovery(false);
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
          <Text style={styles.subtitle}>Iniciar Sesión</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="admin@ejemplo.com"
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
              placeholder="••••••••"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.loadingText}>{loadingMessage}</Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={handleForgotPassword}
            disabled={loading || loadingRecovery}
          >
            {loadingRecovery ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.registerContainer}>
            <Text style={styles.registerQuestion}>¿No tienes cuenta?</Text>
            <TouchableOpacity onPress={onNavigateToRegister} disabled={loading}>
              <Text style={styles.registerLink}>Regístrate</Text>
            </TouchableOpacity>
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
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 24,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  registerQuestion: {
    fontSize: 14,
    color: '#666',
  },
  registerLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
  },
});