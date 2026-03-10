import * as React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import type { MetricCard } from "../../hooks/useDashboardData";

export type { MetricCard };

const PURPLE = "#5C35D9";

function MetricBox({ card }: { card: MetricCard }) {
  return (
    <View
      style={[
        styles.metricCard,
        { backgroundColor: card.soft, borderLeftColor: card.accent },
      ]}
    >
      <View style={[styles.metricIcon, { backgroundColor: card.accent }]}>
        <MaterialCommunityIcons
          name={card.icon as any}
          size={16}
          color="#fff"
        />
      </View>
      <View style={styles.metricInfo}>
        <Text style={styles.metricTitle}>{card.title}</Text>
        <Text style={[styles.metricValue, { color: card.accent }]}>
          {card.value}
        </Text>
      </View>
    </View>
  );
}

interface Props {
  loading: boolean;
  cards: MetricCard[];
}

export default function MetricsGrid({ loading, cards }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Resumen en tiempo real</Text>
      {loading ? (
        <View style={styles.metricsLoading}>
          <ActivityIndicator color={PURPLE} />
          <Text style={styles.metricsLoadingText}>
            Actualizando métricas...
          </Text>
        </View>
      ) : (
        <View style={styles.metricsGrid}>
          {cards.map((card) => (
            <MetricBox key={card.key} card={card} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    paddingLeft: 2,
  },
  metricsLoading: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  metricsLoadingText: { fontSize: 13, color: "#6b7280" },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "47%",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderLeftWidth: 3,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  metricInfo: { flex: 1 },
  metricTitle: { fontSize: 11, color: "#6b7280", fontWeight: "600" },
  metricValue: { fontSize: 20, fontWeight: "800", marginTop: 1 },
});
