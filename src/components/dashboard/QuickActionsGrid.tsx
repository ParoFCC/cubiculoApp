import * as React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import type { QuickCard } from "../../hooks/useDashboardData";

export type { QuickCard };

interface Props {
  cards: QuickCard[];
  onNavigate: (screen: string) => void;
}

export default function QuickActionsGrid({ cards, onNavigate }: Props) {
  if (cards.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Acciones rápidas</Text>
      <View style={styles.quickGrid}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.screen}
            style={[styles.quickCard, { backgroundColor: card.bg }]}
            onPress={() => onNavigate(card.screen)}
            activeOpacity={0.85}
          >
            <View style={styles.quickIconCircle}>
              <MaterialCommunityIcons
                name={card.icon as any}
                size={26}
                color="#fff"
              />
            </View>
            <View style={styles.quickTextBlock}>
              <Text style={styles.quickTitle}>{card.title}</Text>
              <Text style={styles.quickSubtitle}>{card.subtitle}</Text>
            </View>
            <View style={styles.quickFooter}>
              <Text style={styles.quickCta}>Abrir</Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={16}
                color="rgba(255,255,255,0.85)"
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>
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
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCard: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    minHeight: 130,
  },
  quickIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickTextBlock: { gap: 4, flex: 1 },
  quickTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  quickSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 17,
  },
  quickFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickCta: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
  },
});
