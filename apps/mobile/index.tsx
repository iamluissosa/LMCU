import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Punto de entrada para Expo Router.
// registerRootComponent garantiza que la app se registre correctamente
// tanto en Expo Go como en builds nativos standalone.
export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
