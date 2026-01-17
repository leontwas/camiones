import { useRouter } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function GestionarTab() {
  const router = useRouter();

  const menuItems = [
    {
      id: 'choferes',
      title: 'Gestionar Choferes',
      description: 'Agregar, editar o eliminar choferes',
      icon: '👨‍✈️',
      screen: 'gestionarChoferes',
    },
    {
      id: 'tractores',
      title: 'Gestionar Tractores',
      description: 'Agregar, editar o eliminar tractores',
      icon: '🚜',
      screen: 'gestionarTractores',
    },
    {
      id: 'bateas',
      title: 'Gestionar Bateas',
      description: 'Agregar, editar o eliminar bateas',
      icon: '📦',
      screen: 'gestionarBateas',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuCard}
            onPress={() => router.push(`/${item.screen}` as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <View style={styles.textContainer}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDescription}>{item.description}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  menuContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 8,
  },
  icon: {
    fontSize: 40,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 13,
    color: '#666',
  },
  arrow: {
    fontSize: 24,
    color: '#007AFF',
    marginLeft: 8,
  },
});