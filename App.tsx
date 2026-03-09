import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider as PaperProvider, MD3LightTheme } from "react-native-paper";
import Toast from "react-native-toast-message";
import RootNavigator from "./src/navigation/index";
import toastConfig from "./src/components/ToastConfig";

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#5C35D9",
    secondary: "#03A9F4",
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <RootNavigator />
        <Toast config={toastConfig} position="top" topOffset={60} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
