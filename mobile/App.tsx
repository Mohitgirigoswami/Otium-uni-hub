import React from "react";
import { StyleSheet, View, StatusBar } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { TabNavigator } from "./src/navigation/TabNavigator";
import { Header } from "./src/components/Header";
import { colors } from "./src/theme/colors";

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <Header title="Otium" badge="Campus Hub" campusName="DTU Campus" />
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
