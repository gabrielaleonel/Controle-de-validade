import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { ProductWithStatus, FilterType } from "../src/types";
import { MedicationWithStatus, MedicationFilterType } from "../src/types/medications";
import { getAllProducts } from "../src/services/database";
import { getAllMedications } from "../src/services/medicationDatabase";
import { enrichProduct, sortProducts } from "../src/utils";
import {
  enrichMedication,
  sortMedications,
} from "../src/utils/medicationUtils";
import ProductCard from "../src/components/ProductCard";
import MedicationCard from "../src/components/MedicationCard";
import FilterBar from "../src/components/FilterBar";
import FilterBarMedications from "../src/components/FilterBarMedications";
import CategorySelector from "../src/components/CategorySelector";
import { MEDICATION_COLORS } from "../src/constants/medications";

export default function ProductListScreen() {
  const router = useRouter();
  const [category, setCategory] = useState("alimentos");

  const isMedication = category === "remedio";
  const accentColor = isMedication ? MEDICATION_COLORS.primary : "#1565C0";

  const [products, setProducts] = useState<ProductWithStatus[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithStatus[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("todos");

  const [medications, setMedications] = useState<MedicationWithStatus[]>([]);
  const [filteredMedications, setFilteredMedications] = useState<MedicationWithStatus[]>([]);
  const [activeMedicationFilter, setActiveMedicationFilter] = useState<MedicationFilterType>("todos");

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    try {
      const data = await getAllProducts();
      const enriched = sortProducts(data.map(enrichProduct));
      setProducts(enriched);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar os produtos.");
    }
  }, []);

  const loadMedications = useCallback(async () => {
    try {
      const data = await getAllMedications();
      const enriched = sortMedications(data.map(enrichMedication));
      setMedications(enriched);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar os medicamentos.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      if (isMedication) {
        loadMedications().finally(() => setLoading(false));
      } else {
        loadProducts().finally(() => setLoading(false));
      }
    }, [isMedication, loadMedications, loadProducts])
  );

  const applyFilter = (
    data: ProductWithStatus[],
    filter: FilterType,
    query: string
  ) => {
    let result = data;
    if (filter === "vencidos") {
      result = result.filter((p) => p.status === "vencido");
    } else if (filter === "proximos") {
      result = result.filter((p) => p.status === "proximo");
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          (p.codigoBarras && p.codigoBarras.includes(q))
      );
    }
    setFilteredProducts(result);
  };

  const applyMedicationFilter = (
    data: MedicationWithStatus[],
    filter: MedicationFilterType,
    query: string
  ) => {
    let result = data;
    if (filter === "vencidos") {
      result = result.filter((m) => m.statusValidade === "vencido");
    } else if (filter === "proximos_acabar") {
      result = result.filter(
        (m) => m.statusEstoque === "acabando" && m.statusValidade !== "vencido"
      );
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((m) => m.nome.toLowerCase().includes(q));
    }
    setFilteredMedications(result);
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    applyFilter(products, filter, searchQuery);
  };

  const handleMedicationFilterChange = (filter: MedicationFilterType) => {
    setActiveMedicationFilter(filter);
    applyMedicationFilter(medications, filter, searchQuery);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (isMedication) {
      applyMedicationFilter(medications, activeMedicationFilter, text);
    } else {
      applyFilter(products, activeFilter, text);
    }
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    setSearchQuery("");
  };

  const handleProductPress = (product: ProductWithStatus) => {
    router.push(`/details/${product.id}`);
  };

  const handleMedicationPress = (medication: MedicationWithStatus) => {
    router.push(`/medication-details/${medication.id}`);
  };

  const renderEmptyState = (type: "food" | "medication") => {
    const isMed = type === "medication";
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name={isMed ? "pill" : "package-variant-closed"}
          size={64}
          color="#E0E0E0"
        />
        <Text style={styles.emptyTitle}>
          {isMed ? "Nenhum medicamento cadastrado" : "Nenhum produto cadastrado"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {isMed
            ? "Adicione seu primeiro medicamento para controlar o estoque e as validades."
            : "Adicione seu primeiro produto para começar a controlar as validades."}
        </Text>
        <TouchableOpacity
          style={[styles.emptyButton, isMed && { backgroundColor: MEDICATION_COLORS.primary }]}
          onPress={() => router.push(isMed ? "/add-medication" : "/add-product")}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.emptyButtonText}>
            {isMed ? "Adicionar medicamento" : "Adicionar produto"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <CategorySelector selected={category} onSelect={handleCategoryChange} />
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push("/settings")}
        >
          <MaterialCommunityIcons name="cog-outline" size={26} color="#616161" />
        </TouchableOpacity>
      </View>

      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {isMedication
            ? `${medications.length} medicamento(s) cadastrado(s)`
            : `${products.length} produto(s) cadastrado(s)`}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color="#9E9E9E"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={
            isMedication
              ? "Buscar por nome do medicamento ou código de barras"
              : "Buscar por nome ou código de barras..."
          }
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#9E9E9E"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <MaterialCommunityIcons name="close" size={20} color="#9E9E9E" />
          </TouchableOpacity>
        )}
      </View>

      {isMedication ? (
        <FilterBarMedications
          activeFilter={activeMedicationFilter}
          onFilterChange={handleMedicationFilterChange}
        />
      ) : (
        <FilterBar
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      )}

      {isMedication ? (
        filteredMedications.length > 0 ? (
          <FlatList
            data={filteredMedications}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <MedicationCard medication={item} onPress={handleMedicationPress} />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          renderEmptyState("medication")
        )
      ) : (
        filteredProducts.length > 0 ? (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <ProductCard product={item} onPress={handleProductPress} />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          renderEmptyState("food")
        )
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: accentColor }]}
        onPress={() =>
          router.push(isMedication ? "/add-medication" : "/add-product")
        }
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  countRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  countText: {
    fontSize: 14,
    color: "#757575",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#212121",
  },
  list: {
    paddingVertical: 8,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#424242",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1565C0",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#1565C0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
