import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from "react-native-vision-camera";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

interface Props {
  visible: boolean;
  onScan: (value: string) => void;
  onClose: () => void;
}

const PURPLE = "#5C35D9";

export default function QRScannerModal({ visible, onScan, onClose }: Props) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("back");
  const scannedRef = useRef(false);
  const [permissionRequested, setPermissionRequested] = useState(false);

  useEffect(() => {
    if (visible) {
      scannedRef.current = false;
      if (!hasPermission && !permissionRequested) {
        setPermissionRequested(true);
        requestPermission();
      }
    }
  }, [visible]);

  const codeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: (codes) => {
      if (scannedRef.current) return;
      const value = codes[0]?.value;
      if (value) {
        scannedRef.current = true;
        onScan(value);
      }
    },
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Escanear QR del estudiante</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Camera or permission notice */}
        {!hasPermission ? (
          <View style={styles.center}>
            <MaterialCommunityIcons
              name="camera-off"
              size={56}
              color="#9ca3af"
            />
            <Text style={styles.permText}>
              Se necesita permiso para usar la cámara.
            </Text>
            <TouchableOpacity
              style={styles.permBtn}
              onPress={requestPermission}
            >
              <Text style={styles.permBtnText}>Otorgar permiso</Text>
            </TouchableOpacity>
          </View>
        ) : device == null ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={PURPLE} />
            <Text style={styles.permText}>Iniciando cámara...</Text>
          </View>
        ) : (
          <View style={styles.cameraWrap}>
            <Camera
              style={StyleSheet.absoluteFillObject}
              device={device}
              isActive={visible}
              codeScanner={codeScanner}
            />
            {/* Scanning overlay */}
            <View style={styles.overlay}>
              <View style={styles.overlaySide} />
              <View style={styles.overlayCenter}>
                <View style={styles.overlayTop} />
                <View style={styles.scanBox}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
                <View style={styles.overlayBottom} />
              </View>
              <View style={styles.overlaySide} />
            </View>
            <Text style={styles.hint}>
              Apunta al código QR del credencial del estudiante
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const SCAN_SIZE = 220;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "700" },
  closeBtn: { padding: 4 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 24,
  },
  permText: { color: "#9ca3af", fontSize: 15, textAlign: "center" },
  permBtn: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  permBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cameraWrap: { flex: 1, position: "relative" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
  },
  overlaySide: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  overlayCenter: { width: SCAN_SIZE },
  overlayTop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  scanBox: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    borderColor: "transparent",
  },
  overlayBottom: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#fff",
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hint: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
});
