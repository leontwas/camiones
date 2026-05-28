import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export const PerfilScreen = () => {
  const { isAuthenticated, user, logout } = useAuth();

  const executeLogout = async () => {
    await logout();
    if (Platform.OS !== 'web') {
      Alert.alert('Sesión Cerrada', 'Has cerrado sesión exitosamente');
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
        executeLogout();
      }
    } else {
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro que deseas cerrar sesión?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar Sesión', style: 'destructive', onPress: executeLogout },
        ]
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.notAuthContainer}>
          <Text style={styles.notAuthIcon}>🔒</Text>
          <Text style={styles.notAuthTitle}>No has iniciado sesión</Text>
          <Text style={styles.notAuthText}>
            Inicia sesión para acceder a las funciones administrativas
          </Text>
        </View>
      </View>
    );
  }

  const isAdmin = user?.rol === 'admin';
  const isChofer = user?.rol === 'chofer';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={[styles.avatarContainer, isChofer && styles.avatarContainerChofer]}>
          <Text style={styles.avatar}>{isAdmin ? '👤' : '🚛'}</Text>
        </View>
        <Text style={styles.userName}>{user?.nombre || 'Usuario'}</Text>
        <View style={[styles.badge, isChofer && styles.badgeChofer]}>
          <Text style={styles.badgeText}>{isAdmin ? 'Admin' : 'Chofer'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información de la Cuenta</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rol:</Text>
            <Text style={styles.infoValue}>{isAdmin ? 'Administrador' : 'Chofer'}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Sistema de Gestión de Transporte v1.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  notAuthContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  notAuthIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  notAuthTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  notAuthText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  headerCard: {
    backgroundColor: '#fff',
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainerChofer: {
    backgroundColor: '#FFF3E0',
  },
  avatar: {
    fontSize: 50,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeChofer: {
    backgroundColor: '#FF9800',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  permissionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#DC3545',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});