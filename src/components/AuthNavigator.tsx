import React, { useState } from 'react';
import { LoginScreen } from '../screen/LoginScreen';
import { RegisterScreen } from '../screen/RegisterScreen';

export const AuthNavigator: React.FC = () => {
  const [showRegister, setShowRegister] = useState(false);

  if (showRegister) {
    return <RegisterScreen onNavigateToLogin={() => setShowRegister(false)} />;
  }

  return <LoginScreen onNavigateToRegister={() => setShowRegister(true)} />;
};