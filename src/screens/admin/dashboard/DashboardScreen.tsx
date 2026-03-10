import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  searchService,
  SearchGameResult,
  SearchProductResult,
  SearchUserResult,
} from "../../../services/searchService";
import { useAuthStore } from "../../../store/useAuthStore";
import { useCubiculoStore } from "../../../store/useCubiculoStore";
import { cubiculosService } from "../../../services/cubiculosService";
import {
  useDashboardData,
  CriticalItem,
} from "../../../hooks/useDashboardData";
import MetricsGrid from "../../../components/dashboard/MetricsGrid";
import QuickActionsGrid from "../../../components/dashboard/QuickActionsGrid";

const PURPLE = "#5C35D9";
const PURPLE_LIGHT = "#EEE9FF";

interface NavCard {
  screen: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  iconBg: string;
}

type SearchResult =
  | {
      key: string;
      kind: "student";
      title: string;
      subtitle: string;
      payload: SearchUserResult;
    }
  | {
      key: string;
      kind: "game";
      title: string;
      subtitle: string;
      payload: SearchGameResult;
    }
  | {
      key: string;
      kind: "product";
      title: string;
      subtitle: string;
      payload: SearchProductResult;
    };

type ServiceFilter = "all" | "games" | "sales" | "printing" | "admin";

// ── Shared primitives ─────────────────────────────────────────────────────────

function NavRow({
  card,
  onPress,
  isLast,
}: {
  card: NavCard;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.navRow, isLast && styles.navRowLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.navIcon, { backgroundColor: card.iconBg }]}>
        <MaterialCommunityIcons
          name={card.icon as any}
          size={22}
          color={card.iconColor}
        />
      </View>
      <View style={styles.navText}>
        <Text style={styles.navTitle}>{card.title}</Text>
        <Text style={styles.navSub}>{card.subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#d1d5db" />
    </TouchableOpacity>
  );
}

function SectionList({
  title,
  cards,
  navigation,
}: {
  title: string;
  cards: NavCard[];
  navigation: any;
}) {
  if (cards.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.navList}>
        {cards.map((card, i) => (
          <NavRow
            key={card.screen}
            card={card}
            onPress={() => navigation.navigate(card.screen)}
            isLast={i === cards.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

function StatusChip({
  label,
  color,
  bg,
  onLongPress,
}: {
  label: string;
  color: string;
  bg: string;
  onLongPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onLongPress={onLongPress}
      activeOpacity={onLongPress ? 0.7 : 1}
      style={[styles.statusChip, { backgroundColor: bg }]}
    >
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text
        style={[styles.filterChipText, active && styles.filterChipTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CriticalCard({
  item,
  navigation,
}: {
  item: CriticalItem;
  navigation: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.criticalCard, { backgroundColor: item.soft }]}
      onPress={() => navigation.navigate(item.screen)}
      activeOpacity={0.85}
    >
      <View style={[styles.criticalIcon, { backgroundColor: item.accent }]}>
        <MaterialCommunityIcons
          name={item.icon as any}
          size={18}
          color="#fff"
        />
      </View>
      <View style={styles.criticalTextBlock}>
        <Text style={styles.criticalTitle}>{item.title}</Text>
        <Text style={styles.criticalDesc}>{item.description}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color="#94a3b8" />
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const cubiculo = useCubiculoStore((s) => s.selectedCubiculo);
  const clearCubiculo = useCubiculoStore((s) => s.clearCubiculo);
  const setCubiculo = useCubiculoStore((s) => s.setCubiculo);
  const isSuperAdmin = user?.is_super_admin === true;

  const gamesOn = cubiculo?.games_enabled !== false;
  const printOn = cubiculo?.printing_enabled !== false;
  const productsOn = cubiculo?.products_enabled !== false;

  const { loading, criticalItems, metricCards, quickCards, cashStatus } =
    useDashboardData({ gamesOn, printOn, productsOn, isSuperAdmin });

  const toggleService = (
    field: "games_enabled" | "printing_enabled" | "products_enabled",
    label: string,
    current: boolean,
  ) => {
    if (!cubiculo) return;
    Alert.alert(
      current ? `Desactivar ${label}` : `Activar ${label}`,
      current
        ? `¿Desactivar el servicio de ${label}? Los accesos rápidos desaparecerán.`
        : `¿Activar el servicio de ${label}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: current ? "Desactivar" : "Activar",
          style: current ? "destructive" : "default",
          onPress: async () => {
            try {
              const updated = await cubiculosService.update(cubiculo.id, {
                [field]: !current,
              });
              setCubiculo(updated);
            } catch {
              Alert.alert("Error", "No se pudo actualizar el servicio.");
            }
          },
        },
      ],
    );
  };

  const [query, setQuery] = React.useState("");
  const [serviceFilter, setServiceFilter] =
    React.useState<ServiceFilter>("all");
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });
  const firstName = user?.name?.split(" ")[0] ?? "Admin";

  // ── Search debounce ──────────────────────────────────────────────────────────
  const normalizedQuery = query.trim().toLowerCase();

  React.useEffect(() => {
    if (normalizedQuery.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await searchService.searchGlobal(normalizedQuery, 4);
        setSearchResults([
          ...response.users.map((s) => ({
            key: `student-${s.id}`,
            kind: "student" as const,
            title: s.name,
            subtitle: s.student_id ?? s.email,
            payload: s,
          })),
          ...response.games.map((g) => ({
            key: `game-${g.id}`,
            kind: "game" as const,
            title: g.name,
            subtitle: `${g.quantity_avail}/${g.quantity_total} disponibles`,
            payload: g,
          })),
          ...response.products.map((p) => ({
            key: `product-${p.id}`,
            kind: "product" as const,
            title: p.name,
            subtitle: `Stock ${p.stock} · $${p.price.toFixed(2)}`,
            payload: p,
          })),
        ]);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [normalizedQuery]);

  // ── Nav card lists ────────────────────────────────────────────────────────────
  const inventoryCards: NavCard[] = [
    gamesOn && {
      screen: "Inventory",
      title: "Juegos",
      subtitle: "Catálogo, QRs y editar",
      icon: "dice-multiple",
      iconColor: PURPLE,
      iconBg: PURPLE_LIGHT,
    },
    productsOn && {
      screen: "InventoryProduct",
      title: "Productos",
      subtitle: "Stock y precios",
      icon: "package-variant",
      iconColor: "#be185d",
      iconBg: "#fce7f3",
    },
    productsOn && {
      screen: "CashRegister",
      title: "Caja",
      subtitle: "Abrir o cerrar caja",
      icon: "cash-register",
      iconColor: "#D97706",
      iconBg: "#fef3c7",
    },
  ].filter(Boolean) as NavCard[];

  const reportCards: NavCard[] = [
    gamesOn && {
      screen: "LoanHistory",
      title: "Historial de préstamos",
      subtitle: "Activos e histórico",
      icon: "history",
      iconColor: "#64748b",
      iconBg: "#f1f5f9",
    },
    printOn && {
      screen: "PrintHistoryAdmin",
      title: "Historial de impresiones",
      subtitle: "Reporte global",
      icon: "printer-eye",
      iconColor: "#0284c7",
      iconBg: "#e0f2fe",
    },
    productsOn && {
      screen: "SalesReport",
      title: "Reporte de ventas",
      subtitle: "Estadísticas y desglose",
      icon: "chart-bar",
      iconColor: "#16a34a",
      iconBg: "#dcfce7",
    },
  ].filter(Boolean) as NavCard[];

  const adminCards: NavCard[] = isSuperAdmin
    ? [
        {
          screen: "UsersAdmin",
          title: "Usuarios",
          subtitle: "Administrar cuentas",
          icon: "account-group",
          iconColor: "#dc2626",
          iconBg: "#fee2e2",
        },
        {
          screen: "CubiculosAdmin",
          title: "Cubículos",
          subtitle: "Configurar servicios",
          icon: "office-building-cog",
          iconColor: "#9333ea",
          iconBg: "#f3e8ff",
        },
      ]
    : [];

  const toolCards: NavCard[] = [
    {
      screen: "QrCodes",
      title: "Códigos QR",
      subtitle: "Generar y compartir accesos rápidos",
      icon: "qrcode",
      iconColor: "#7c3aed",
      iconBg: "#f3e8ff",
    },
  ];

  // ── Filtered card lists ───────────────────────────────────────────────────────
  const filteredInventoryCards =
    serviceFilter === "all"
      ? inventoryCards
      : inventoryCards.filter((card) => {
          if (serviceFilter === "games") return card.screen === "Inventory";
          if (serviceFilter === "sales")
            return ["InventoryProduct", "CashRegister"].includes(card.screen);
          return false;
        });

  const filteredReportCards =
    serviceFilter === "all"
      ? reportCards
      : reportCards.filter((card) => {
          if (serviceFilter === "games") return card.screen === "LoanHistory";
          if (serviceFilter === "sales") return card.screen === "SalesReport";
          if (serviceFilter === "printing")
            return card.screen === "PrintHistoryAdmin";
          return false;
        });

  const filteredToolCards =
    serviceFilter === "all" || serviceFilter === "admin" ? toolCards : [];

  const filteredAdminCards =
    serviceFilter === "all" || serviceFilter === "admin" ? adminCards : [];

  const filteredQuickCards = quickCards.filter((card) => {
    if (serviceFilter === "all") return true;
    if (serviceFilter === "games")
      return ["RegisterLoan", "RegisterReturn", "LoanHistory"].includes(
        card.screen,
      );
    if (serviceFilter === "sales")
      return ["RegisterSale", "CashRegister"].includes(card.screen);
    if (serviceFilter === "printing") return card.screen === "RegisterPrint";
    return false;
  });

  const handleSearchResultPress = (result: SearchResult) => {
    if (result.kind === "game") {
      navigation.navigate("RegisterLoan", { preselectedGame: result.payload });
      return;
    }
    if (result.kind === "product") {
      navigation.navigate("RegisterSale", {
        preselectedProductId: result.payload.id,
      });
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero header */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroLeft}>
            <Text style={styles.greeting}>Hola, {firstName} 👋</Text>
            <Text style={styles.date}>{today}</Text>
            <Text style={styles.heroSub}>
              Centraliza operaciones, reportes y herramientas desde un solo
              lugar.
            </Text>
          </View>
          <View style={styles.heroActions}>
            {isSuperAdmin && (
              <TouchableOpacity
                style={styles.heroActionBtn}
                onPress={clearCubiculo}
              >
                <MaterialCommunityIcons
                  name="office-building-outline"
                  size={18}
                  color="rgba(255,255,255,0.85)"
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.heroActionBtn, styles.heroLogoutBtn]}
              onPress={logout}
            >
              <MaterialCommunityIcons name="logout" size={18} color="#fca5a5" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.cubiculoBadge}>
          <MaterialCommunityIcons
            name="office-building-outline"
            size={13}
            color={PURPLE}
          />
          <Text style={styles.cubiculoName} numberOfLines={1}>
            {cubiculo?.name ?? "Cubículo"}
          </Text>
        </View>
        <View style={styles.statusRow}>
          {gamesOn && (
            <StatusChip
              label="Juegos activo"
              color="#5B21B6"
              bg="#EDE9FE"
              onLongPress={() => toggleService("games_enabled", "juegos", true)}
            />
          )}
          {printOn && (
            <StatusChip
              label="Impresión activa"
              color="#0C4A6E"
              bg="#E0F2FE"
              onLongPress={() =>
                toggleService("printing_enabled", "impresión", true)
              }
            />
          )}
          {productsOn && (
            <StatusChip
              label="Ventas activas"
              color="#166534"
              bg="#DCFCE7"
              onLongPress={() =>
                toggleService("products_enabled", "ventas", true)
              }
            />
          )}
        </View>
      </View>

      {criticalItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Pendientes críticos</Text>
          <View style={styles.criticalList}>
            {criticalItems.map((item) => (
              <CriticalCard
                key={item.key}
                item={item}
                navigation={navigation}
              />
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Filtros rápidos</Text>
        <View style={styles.filterRow}>
          <FilterChip
            label="Todos"
            active={serviceFilter === "all"}
            onPress={() => setServiceFilter("all")}
          />
          {gamesOn && (
            <FilterChip
              label="Juegos"
              active={serviceFilter === "games"}
              onPress={() => setServiceFilter("games")}
            />
          )}
          {productsOn && (
            <FilterChip
              label="Ventas"
              active={serviceFilter === "sales"}
              onPress={() => setServiceFilter("sales")}
            />
          )}
          {printOn && (
            <FilterChip
              label="Impresiones"
              active={serviceFilter === "printing"}
              onPress={() => setServiceFilter("printing")}
            />
          )}
          {isSuperAdmin && (
            <FilterChip
              label="Administración"
              active={serviceFilter === "admin"}
              onPress={() => setServiceFilter("admin")}
            />
          )}
        </View>
      </View>

      <QuickActionsGrid
        cards={filteredQuickCards}
        onNavigate={(screen) => navigation.navigate(screen)}
      />

      <MetricsGrid loading={loading} cards={metricCards} />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Búsqueda global</Text>
        <View style={styles.searchCard}>
          <View style={styles.searchInputWrap}>
            <MaterialCommunityIcons name="magnify" size={18} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar estudiante, juego o producto"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color="#cbd5e1"
                />
              </TouchableOpacity>
            )}
          </View>
          {normalizedQuery.length > 0 && (
            <View style={styles.searchResults}>
              {searchLoading ? (
                <View style={styles.searchLoadingWrap}>
                  <ActivityIndicator size="small" color={PURPLE} />
                  <Text style={styles.searchLoadingText}>Buscando...</Text>
                </View>
              ) : searchResults.length === 0 ? (
                <Text style={styles.emptySearch}>
                  Sin resultados para "{query}"
                </Text>
              ) : (
                searchResults.map((result) => (
                  <View key={result.key} style={styles.searchRow}>
                    <TouchableOpacity
                      style={styles.searchRowMain}
                      onPress={() => handleSearchResultPress(result)}
                      disabled={result.kind === "student"}
                    >
                      <View style={styles.searchIconWrap}>
                        <MaterialCommunityIcons
                          name={
                            result.kind === "student"
                              ? "account-outline"
                              : result.kind === "game"
                              ? "dice-multiple-outline"
                              : "package-variant-closed"
                          }
                          size={18}
                          color={PURPLE}
                        />
                      </View>
                      <View style={styles.searchTextBlock}>
                        <Text style={styles.searchTitle}>{result.title}</Text>
                        <Text style={styles.searchSub}>{result.subtitle}</Text>
                      </View>
                    </TouchableOpacity>
                    {result.kind === "student" && result.payload.student_id && (
                      <View style={styles.searchActionsWrap}>
                        {gamesOn && (
                          <TouchableOpacity
                            style={styles.searchActionBtn}
                            onPress={() =>
                              navigation.navigate("RegisterLoan", {
                                preselectedStudentId: result.payload.student_id,
                              })
                            }
                          >
                            <Text style={styles.searchActionText}>
                              Préstamo
                            </Text>
                          </TouchableOpacity>
                        )}
                        {printOn && (
                          <TouchableOpacity
                            style={styles.searchActionBtn}
                            onPress={() =>
                              navigation.navigate("RegisterPrint", {
                                preselectedStudentId: result.payload.student_id,
                              })
                            }
                          >
                            <Text style={styles.searchActionText}>
                              Impresión
                            </Text>
                          </TouchableOpacity>
                        )}
                        {productsOn && (
                          <TouchableOpacity
                            style={styles.searchActionBtn}
                            onPress={() =>
                              navigation.navigate(
                                cashStatus?.status === "open"
                                  ? "RegisterSale"
                                  : "CashRegister",
                                cashStatus?.status === "open"
                                  ? {
                                      preselectedStudentId:
                                        result.payload.student_id,
                                    }
                                  : undefined,
                              )
                            }
                          >
                            <Text style={styles.searchActionText}>
                              {cashStatus?.status === "open" ? "Venta" : "Caja"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </View>

      <SectionList
        title="Inventario"
        cards={filteredInventoryCards}
        navigation={navigation}
      />
      <SectionList
        title="Reportes e historial"
        cards={filteredReportCards}
        navigation={navigation}
      />
      <SectionList
        title="Herramientas"
        cards={filteredToolCards}
        navigation={navigation}
      />
      {filteredAdminCards.length > 0 && (
        <SectionList
          title="Administración"
          cards={filteredAdminCards}
          navigation={navigation}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F7FF" },
  content: { padding: 16, paddingBottom: 40, gap: 20 },

  // Hero
  hero: {
    backgroundColor: PURPLE,
    borderRadius: 20,
    padding: 20,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  heroLeft: { flex: 1, marginRight: 12 },
  heroActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  heroActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroLogoutBtn: { backgroundColor: "rgba(239,68,68,0.2)" },
  greeting: { color: "#fff", fontSize: 22, fontWeight: "800" },
  date: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginTop: 3,
    textTransform: "capitalize",
  },
  heroSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
    maxWidth: 220,
  },
  cubiculoBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
    marginBottom: 10,
  },
  cubiculoName: {
    fontSize: 12,
    fontWeight: "700",
    color: PURPLE,
    flexShrink: 1,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },

  // Sections
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    paddingLeft: 2,
  },
  criticalList: { gap: 10 },
  criticalCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  criticalIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  criticalTextBlock: { flex: 1 },
  criticalTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  criticalDesc: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 3,
    lineHeight: 17,
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterChipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  filterChipText: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
  filterChipTextActive: { color: "#fff" },

  // Search
  searchCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 10,
  },
  searchResults: { gap: 10 },
  searchLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  searchLoadingText: { fontSize: 13, color: "#6b7280" },
  searchRow: {
    borderWidth: 1,
    borderColor: "#eef2f7",
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  searchRowMain: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f5f3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  searchTextBlock: { flex: 1 },
  searchTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  searchSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  searchActionsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  searchActionBtn: {
    backgroundColor: "#F5F3FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  searchActionText: { color: PURPLE, fontSize: 12, fontWeight: "700" },
  emptySearch: { fontSize: 13, color: "#9ca3af", paddingVertical: 6 },

  // Nav list
  navList: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#5C35D9",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  navRowLast: { borderBottomWidth: 0 },
  navIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  navText: { flex: 1 },
  navTitle: { fontSize: 15, fontWeight: "600", color: "#1a1a2e" },
  navSub: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
});
