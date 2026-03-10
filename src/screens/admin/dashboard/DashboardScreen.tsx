import * as React from "react";
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { gamesService } from "../../../services/gamesService";
import { printingService } from "../../../services/printingService";
import { productsService } from "../../../services/productsService";
import {
  searchService,
  SearchGameResult,
  SearchProductResult,
  SearchUserResult,
} from "../../../services/searchService";
import { useAuthStore } from "../../../store/useAuthStore";
import { useCubiculoStore } from "../../../store/useCubiculoStore";
// SUPER_ADMIN_ID replaced by user.is_super_admin
import { GameLoan } from "../../../types/games.types";
import { CashRegister, Product, Sale } from "../../../types/products.types";
import { PrintHistoryItem } from "../../../types/printing.types";

const PURPLE = "#5C35D9";
const PURPLE_LIGHT = "#EEE9FF";
const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 32 - 10) / 2;

interface QuickCard {
  screen: string;
  title: string;
  icon: string;
  bg: string;
  subtitle: string;
}

interface NavCard {
  screen: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  iconBg: string;
}

interface MetricCard {
  key: string;
  title: string;
  value: string;
  helper: string;
  accent: string;
  soft: string;
  icon: string;
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

interface CriticalItem {
  key: string;
  title: string;
  description: string;
  accent: string;
  soft: string;
  icon: string;
  screen: string;
}

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
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.statusChip, { backgroundColor: bg }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

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

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const cubiculo = useCubiculoStore((s) => s.selectedCubiculo);
  const isSuperAdmin = user?.is_super_admin === true;

  const gamesOn = cubiculo?.games_enabled !== false;
  const printOn = cubiculo?.printing_enabled !== false;
  const productsOn = cubiculo?.products_enabled !== false;

  const [loading, setLoading] = React.useState(true);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loanHistory, setLoanHistory] = React.useState<GameLoan[]>([]);
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [printHistory, setPrintHistory] = React.useState<PrintHistoryItem[]>(
    [],
  );
  const [cashStatus, setCashStatus] = React.useState<CashRegister | null>(null);
  const [query, setQuery] = React.useState("");
  const [serviceFilter, setServiceFilter] =
    React.useState<ServiceFilter>("all");
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });
  const firstName = user?.name?.split(" ")[0] ?? "Admin";

  const loadDashboard = React.useCallback(async () => {
    setLoading(true);
    try {
      const [
        loanResp,
        salesResp,
        cashResp,
        printResp,
        _gamesResp,
        productsResp,
      ] = await Promise.all([
        gamesOn
          ? gamesService.getLoanHistory().catch(() => [])
          : Promise.resolve([]),
        productsOn
          ? productsService.getSales().catch(() => [])
          : Promise.resolve([]),
        productsOn
          ? productsService.getCashRegisterStatus().catch(() => null)
          : Promise.resolve(null),
        printOn
          ? printingService.getAllHistory().catch(() => [])
          : Promise.resolve([]),
        gamesOn
          ? gamesService.getCatalog().catch(() => [])
          : Promise.resolve([]),
        productsOn
          ? productsService.getCatalog().catch(() => [])
          : Promise.resolve([]),
      ]);

      setLoanHistory(loanResp);
      setSales(salesResp);
      setCashStatus(cashResp);
      setPrintHistory(printResp);
      setProducts(productsResp.filter((product) => product.is_active));
    } finally {
      setLoading(false);
    }
  }, [gamesOn, printOn, productsOn]);

  useFocusEffect(
    React.useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const isSameDay = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  const activeLoans = loanHistory.filter(
    (loan) => loan.status === "active",
  ).length;
  const overdueLoans = loanHistory.filter((loan) => {
    if (loan.status === "overdue") return true;
    if (loan.status !== "active" || !loan.due_at) return false;
    return new Date(loan.due_at).getTime() < Date.now();
  }).length;
  const todaySales = sales.filter((sale) => isSameDay(sale.sold_at));
  const todaySalesTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const todayPrints = printHistory.filter((item) => isSameDay(item.printed_at));
  const todayPrintPages = todayPrints.reduce(
    (sum, item) => sum + item.pages,
    0,
  );
  const lowStockProducts = products.filter(
    (product) => product.stock > 0 && product.stock <= 3,
  ).length;

  const criticalItems: CriticalItem[] = [
    overdueLoans > 0 && {
      key: "overdue-loans",
      title: `${overdueLoans} préstamos vencidos`,
      description: "Revisa devoluciones pendientes y seguimiento.",
      accent: "#b91c1c",
      soft: "#fee2e2",
      icon: "alert-circle-outline",
      screen: "LoanHistory",
    },
    lowStockProducts > 0 && {
      key: "low-stock",
      title: `${lowStockProducts} productos con stock bajo`,
      description: "Repón inventario antes de quedarte sin venta.",
      accent: "#b45309",
      soft: "#ffedd5",
      icon: "package-variant-closed-alert",
      screen: "InventoryProduct",
    },
    cashStatus?.status === "open" && {
      key: "cash-open",
      title: "Caja pendiente de cierre",
      description: "Hay una caja abierta que sigue operando.",
      accent: "#15803d",
      soft: "#dcfce7",
      icon: "cash-clock",
      screen: "CashRegister",
    },
  ].filter(Boolean) as CriticalItem[];

  const metricCards: MetricCard[] = [
    {
      key: "active-loans",
      title: "Préstamos activos",
      value: `${activeLoans}`,
      helper:
        activeLoans === 1
          ? "1 préstamo pendiente"
          : `${activeLoans} pendientes`,
      accent: PURPLE,
      soft: "#ede9fe",
      icon: "hand-coin-outline",
    },
    {
      key: "cash-status",
      title: "Caja",
      value: cashStatus?.status === "open" ? "Abierta" : "Cerrada",
      helper:
        cashStatus?.status === "open"
          ? `Apertura $${(cashStatus.opening_balance ?? 0).toFixed(2)}`
          : "Sin caja operando",
      accent: cashStatus?.status === "open" ? "#15803d" : "#b45309",
      soft: cashStatus?.status === "open" ? "#dcfce7" : "#ffedd5",
      icon: cashStatus?.status === "open" ? "cash-check" : "cash-remove",
    },
    {
      key: "today-sales",
      title: "Ventas de hoy",
      value: `$${todaySalesTotal.toFixed(2)}`,
      helper:
        todaySales.length === 1 ? "1 venta" : `${todaySales.length} ventas`,
      accent: "#059669",
      soft: "#d1fae5",
      icon: "cart-check",
    },
    {
      key: "today-prints",
      title: "Impresiones de hoy",
      value: `${todayPrintPages}`,
      helper:
        todayPrints.length === 1
          ? "1 registro"
          : `${todayPrints.length} registros`,
      accent: "#0284c7",
      soft: "#e0f2fe",
      icon: "printer-outline",
    },
  ];

  const quickCards: QuickCard[] = [
    gamesOn && {
      screen: "RegisterLoan",
      title: "Préstamo",
      icon: "hand-pointing-right",
      bg: PURPLE,
      subtitle: "Registrar salida",
    },
    gamesOn &&
      activeLoans > 0 && {
        screen: "RegisterReturn",
        title: "Devolución",
        icon: "hand-okay",
        bg: "#D97706",
        subtitle: `${activeLoans} por recibir`,
      },
    printOn && {
      screen: "RegisterPrint",
      title: "Impresión",
      icon: "printer",
      bg: "#0891B2",
      subtitle: "Cargar páginas",
    },
    productsOn &&
      (cashStatus?.status === "open"
        ? {
            screen: "RegisterSale",
            title: "Venta",
            icon: "cart",
            bg: "#059669",
            subtitle: "Cobro rápido",
          }
        : {
            screen: "CashRegister",
            title: "Abrir caja",
            icon: "cash-register",
            bg: "#BE123C",
            subtitle: "Ventas bloqueadas",
          }),
  ].filter(Boolean) as QuickCard[];

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
          ...response.users.map((student) => ({
            key: `student-${student.id}`,
            kind: "student" as const,
            title: student.name,
            subtitle: student.student_id ?? student.email,
            payload: student,
          })),
          ...response.games.map((game) => ({
            key: `game-${game.id}`,
            kind: "game" as const,
            title: game.name,
            subtitle: `${game.quantity_avail}/${game.quantity_total} disponibles`,
            payload: game,
          })),
          ...response.products.map((product) => ({
            key: `product-${product.id}`,
            kind: "product" as const,
            title: product.name,
            subtitle: `Stock ${product.stock} · $${product.price.toFixed(2)}`,
            payload: product,
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

  const filteredInventoryCards =
    serviceFilter === "all"
      ? inventoryCards
      : inventoryCards.filter((card) => {
          if (serviceFilter === "games")
            return ["Inventory"].includes(card.screen);
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
      return;
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
        </View>
        <View style={styles.statusRow}>
          {gamesOn && (
            <StatusChip label="Juegos activo" color="#5B21B6" bg="#EDE9FE" />
          )}
          {printOn && (
            <StatusChip label="Impresión activa" color="#0C4A6E" bg="#E0F2FE" />
          )}
          {productsOn && (
            <StatusChip label="Ventas activas" color="#166534" bg="#DCFCE7" />
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

      {/* Quick actions grid */}
      {filteredQuickCards.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Acciones rápidas</Text>
          <View style={styles.quickGrid}>
            {filteredQuickCards.map((card) => (
              <TouchableOpacity
                key={card.screen}
                style={[
                  styles.quickCard,
                  { backgroundColor: card.bg, width: CARD_W },
                ]}
                onPress={() => navigation.navigate(card.screen)}
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
      )}

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
            {metricCards.map((card) => (
              <MetricBox key={card.key} card={card} />
            ))}
          </View>
        )}
      </View>

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
  },
  heroLeft: { flex: 1, marginRight: 12 },
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
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
    maxWidth: 130,
    flexShrink: 0,
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
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Section
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
  metricsLoadingText: {
    fontSize: 13,
    color: "#6b7280",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
  criticalTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  criticalDesc: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 3,
    lineHeight: 17,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterChipActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  metricCard: {
    width: CARD_W,
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
  metricTitle: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 1,
  },
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
  searchResults: {
    gap: 10,
  },
  searchLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  searchLoadingText: {
    fontSize: 13,
    color: "#6b7280",
  },
  searchRow: {
    borderWidth: 1,
    borderColor: "#eef2f7",
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  searchRowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f5f3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  searchTextBlock: { flex: 1 },
  searchTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  searchSub: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  searchActionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  searchActionBtn: {
    backgroundColor: "#F5F3FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  searchActionText: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: "700",
  },
  emptySearch: {
    fontSize: 13,
    color: "#9ca3af",
    paddingVertical: 6,
  },

  // Quick grid
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    minHeight: 156,
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
  quickTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
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
