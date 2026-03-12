import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { launchCamera } from "react-native-image-picker";
import TextRecognition from "@react-native-ml-kit/text-recognition";

interface Props {
  visible: boolean;
  onScan: (matricula: string) => void;
  onClose: () => void;
}

const PURPLE = "#5C35D9";
const MATRICULA_RE = /\b(\d{9})\b/g;

export default function IDScannerModal({ visible, onScan, onClose }: Props) {
  const [processing, setProcessing] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [noMatch, setNoMatch] = useState(false);

  const reset = () => {
    setImageUri(null);
    setCandidates([]);
    setNoMatch(false);
    setProcessing(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickPhoto = async () => {
    reset();
    launchCamera(
      {
        mediaType: "photo",
        quality: 1,
        saveToPhotos: false,
      },
      async (response) => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (!asset?.uri) return;

        setImageUri(asset.uri);
        setProcessing(true);
        try {
          const result = await TextRecognition.recognize(asset.uri);
          const fullText = result.blocks
            .map((b) => b.lines.map((l) => l.text).join(" "))
            .join(" ");

          const matches = [...fullText.matchAll(MATRICULA_RE)].map((m) => m[1]);
          const unique = [...new Set(matches)];

          if (unique.length === 1) {
            reset();
            onScan(unique[0]);
          } else if (unique.length > 1) {
            setCandidates(unique);
          } else {
            setNoMatch(true);
          }
        } catch {
          Alert.alert(
            "Error de OCR",
            "No se pudo procesar la imagen. Intenta de nuevo con mejor iluminación.",
          );
          reset();
        } finally {
          setProcessing(false);
        }
      },
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="card-account-details-outline"
              size={22}
              color={PURPLE}
            />
            <Text style={styles.title}>Escanear Credencial</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {/* Instructions */}
            {!imageUri && !processing && (
              <Text style={styles.hint}>
                Toma una foto clara de la credencial estudiantil. El sistema
                buscará automáticamente la matrícula de 9 dígitos.
              </Text>
            )}

            {/* Preview */}
            {imageUri && (
              <Image
                source={{ uri: imageUri }}
                style={styles.preview}
                resizeMode="contain"
              />
            )}

            {/* Processing indicator */}
            {processing && (
              <View style={styles.processingRow}>
                <ActivityIndicator color={PURPLE} />
                <Text style={styles.processingText}>Analizando imagen...</Text>
              </View>
            )}

            {/* No match found */}
            {noMatch && !processing && (
              <View style={styles.noMatchBox}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={20}
                  color="#D97706"
                />
                <Text style={styles.noMatchText}>
                  No se encontró una matrícula de 9 dígitos. Intenta con mejor
                  iluminación o enfoque.
                </Text>
              </View>
            )}

            {/* Multiple candidates */}
            {candidates.length > 1 && !processing && (
              <>
                <Text style={styles.candidatesLabel}>
                  Se encontraron varios números. Selecciona la matrícula:
                </Text>
                {candidates.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={styles.candidateRow}
                    onPress={() => {
                      reset();
                      onScan(c);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="numeric"
                      size={18}
                      color={PURPLE}
                    />
                    <Text style={styles.candidateText}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Action button */}
            {!processing && (
              <TouchableOpacity style={styles.btn} onPress={handlePickPhoto}>
                <MaterialCommunityIcons
                  name="camera-outline"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.btnText}>
                  {imageUri ? "Tomar otra foto" : "Tomar foto"}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  body: {
    padding: 20,
    gap: 14,
  },
  hint: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    textAlign: "center",
  },
  preview: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
  },
  processingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  processingText: {
    fontSize: 14,
    color: "#6b7280",
  },
  noMatchBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#fffbeb",
    borderRadius: 8,
    padding: 12,
  },
  noMatchText: {
    flex: 1,
    fontSize: 13,
    color: "#92400e",
    lineHeight: 18,
  },
  candidatesLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  candidateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f5f3ff",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#ede9fe",
  },
  candidateText: {
    fontSize: 16,
    fontWeight: "700",
    color: PURPLE,
    letterSpacing: 1,
  },
  btn: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
