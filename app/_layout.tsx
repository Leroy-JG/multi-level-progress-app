import {
  Raleway_400Regular,
  Raleway_500Medium,
  Raleway_600SemiBold,
  Raleway_700Bold,
  Raleway_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/raleway';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { StoreProvider, useStore } from '../src/store/store';
import { BackupPrompt } from '../src/ui/BackupPrompt';
import { SheetProvider } from '../src/ui/SheetHost';
import { ThemeProvider, useTheme } from '../src/ui/theme';

function Shell() {
  const { settings } = useStore();
  return (
    <ThemeProvider mode={settings.themeMode}>
      <Themed />
    </ThemeProvider>
  );
}

function Themed() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <SheetProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: theme.bg } }}>
          <Stack.Screen name="node/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="backups" options={{ animation: 'slide_from_right' }} />
        </Stack>
        <BackupPrompt />
      </SheetProvider>
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Raleway_400Regular,
    Raleway_500Medium,
    Raleway_600SemiBold,
    Raleway_700Bold,
    Raleway_800ExtraBold,
  });
  // Si la police ne se charge pas, on affiche quand même l'app avec la police système.
  if (!loaded && !error) return null;
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
