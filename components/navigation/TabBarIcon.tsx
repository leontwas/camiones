import { Ionicons } from '@expo/vector-icons';
import { StyleProp, TextStyle } from 'react-native';

interface TabBarIconProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
  style?: StyleProp<TextStyle>;
}

export function TabBarIcon({ name, color, size = 28, style }: TabBarIconProps) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}
