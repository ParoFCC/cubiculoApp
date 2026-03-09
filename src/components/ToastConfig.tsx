import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BaseToast, ErrorToast, ToastConfig } from "react-native-toast-message";

const styles = StyleSheet.create({
  successBase: {
    borderLeftColor: "#22C55E",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    paddingVertical: 10,
    height: "auto",
    minHeight: 60,
  },
  errorBase: {
    borderLeftColor: "#EF4444",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingVertical: 10,
    height: "auto",
    minHeight: 60,
  },
  infoBase: {
    borderLeftColor: "#5C35D9",
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
    paddingVertical: 10,
    height: "auto",
    minHeight: 60,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
    flexWrap: "wrap",
  },
  message: {
    fontSize: 13,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  successTitle: { color: "#166534" },
  successMessage: { color: "#15803D" },
  errorTitle: { color: "#991B1B" },
  errorMessage: { color: "#B91C1C" },
  infoTitle: { color: "#3730A3" },
  infoMessage: { color: "#4338CA" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  infoContent: { flex: 1, paddingLeft: 10 },
});

const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={styles.successBase}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={[styles.title, styles.successTitle]}
      text2Style={[styles.message, styles.successMessage]}
      text1NumberOfLines={0}
      text2NumberOfLines={0}
    />
  ),

  error: (props) => (
    <ErrorToast
      {...props}
      style={styles.errorBase}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={[styles.title, styles.errorTitle]}
      text2Style={[styles.message, styles.errorMessage]}
      text1NumberOfLines={0}
      text2NumberOfLines={0}
    />
  ),

  info: ({ text1, text2 }) => (
    <View style={[styles.infoBase, { marginHorizontal: 16 }]}>
      <View style={styles.infoRow}>
        <View style={styles.infoContent}>
          {text1 ? (
            <Text style={[styles.title, styles.infoTitle]}>{text1}</Text>
          ) : null}
          {text2 ? (
            <Text style={[styles.message, styles.infoMessage]}>{text2}</Text>
          ) : null}
        </View>
      </View>
    </View>
  ),
};

export default toastConfig;
