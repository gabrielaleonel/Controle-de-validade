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
import { Product, ProductWithStatus, FilterType } from "../src/types";
import { getAllProducts, searchProducts } from "../src/services/database";
import { enrichProduct, sortProducts } from "../src/utils";
import ProductCard from "../src/components/ProductCard";
import FilterBar from "../src/components/FilterBar";

export default function ProductListScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithStatus[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithStatus[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    try {
      const data = await getAllProducts();
      const enriched = sortProducts(data.map(enrichProduct));
      setProducts(enriched);
      applyFilter(enriched, activeFilter, searchQuery);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar os produtos.");
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadProducts();
    }, [loadProducts])
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

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    applyFilter(products, filter, searchQuery);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilter(products, activeFilter, text);
  };

  const handleProductPress = (product: ProductWithStatus) => {
    router.push(`/details/${product.id}`);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="package-variant-closed" size={64} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>Nenhum produto cadastrado</Text>
      <Text style={styles.emptySubtitle}>
        Adicione seu primeiro produto para começar a controlar as validades.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push("/add-product")}
      >
        <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        <Text style={styles.emptyButtonText}>Adicionar produto</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Validade</Text>
          <Text style={styles.subtitle}>
            {products.length} produto(s) cadastrado(s)
          </Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push("/settings")}
        >
          <MaterialCommunityIcons name="cog-outline" size={26} color="#616161" />
        </TouchableOpacity>
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
          placeholder="Buscar por nome ou código de barras..."
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

      <FilterBar activeFilter={activeFilter} onFilterChange={handleFilterChange} />

      {filteredProducts.length > 0 ? (
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
        renderEmptyState()
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/add-product")}
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
    alignItems: "flex-start",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  headerLeft: {
    flex: 1,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#212121",
  },
  subtitle: {
    fontSize: 14,
    color: "#757575",
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 8,
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
    backgroundColor: "#1565C0",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#1565C0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
