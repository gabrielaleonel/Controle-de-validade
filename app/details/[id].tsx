import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Product, ProductWithStatus } from "../../src/types";
import { getProduct, deleteProduct } from "../../src/services/database";
import { cancelNotification } from "../../src/services/notifications";
import { enrichProduct, formatDate } from "../../src/utils";
import { STATUS_COLORS, STATUS_LABELS } from "../../src/constants";

export default function ProductDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<ProductWithStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getProduct(Number(id));
      if (data) {
        setProduct(enrichProduct(data));
      }
    } catch {
      Alert.alert("Erro", "Não foi possível carregar o produto.");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadProduct();
    }, [loadProduct])
  );

  const handleDelete = () => {
    if (!product) return;
    Alert.alert(
      "Excluir produto",
      "Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              if (product.notificacaoId) {
                await cancelNotification(product.notificacaoId);
              }
              await deleteProduct(product.id);
              Alert.alert("Sucesso", "Produto excluído.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch {
              Alert.alert("Erro", "Não foi possível excluir o produto.");
            }
          },
        },
      ]
    );
  };

  if (loading || !product) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[product.status];
  const statusLabel = STATUS_LABELS[product.status];

  const daysText =
    product.diasRestantes < 0
      ? `Vencido há ${Math.abs(product.diasRestantes)} dia(s)`
      : product.diasRestantes === 0
      ? "Vence hoje"
      : `${product.diasRestantes} dia(s) restantes`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.title}>Detalhes</Text>
        <TouchableOpacity
          onPress={() => router.push(`/edit-product/${product.id}`)}
          style={styles.editButton}
        >
          <MaterialCommunityIcons name="pencil" size={22} color="#1565C0" />
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
        <Text style={[styles.daysText, { color: statusColor }]}>{daysText}</Text>
      </View>

      {product.fotoUri ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.fotoUri }} style={styles.image} />
        </View>
      ) : (
        <View style={styles.imagePlaceholder}>
          <MaterialCommunityIcons
            name="package-variant-closed"
            size={64}
            color="#BDBDBD"
          />
          <Text style={styles.noImageText}>Sem foto</Text>
        </View>
      )}

      <View style={styles.infoSection}>
        <InfoRow
          icon="tag-text"
          label="Nome"
          value={product.nome}
        />
        {product.codigoBarras && (
          <InfoRow
            icon="barcode"
            label="Código de barras"
            value={product.codigoBarras}
          />
        )}
        <InfoRow
          icon="calendar"
          label="Data de vencimento"
          value={formatDate(product.dataVencimento)}
        />
        {product.observacoes && (
          <InfoRow
            icon="note-text"
            label="Observações"
            value={product.observacoes}
          />
        )}
        <InfoRow
          icon="clock-outline"
          label="Cadastrado em"
          value={formatDate(product.criadoEm)}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButtonLarge}
          onPress={() => router.push(`/edit-product/${product.id}`)}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
          <Text style={styles.editButtonText}>Editar produto</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <MaterialCommunityIcons name="delete-outline" size={20} color="#D32F2F" />
          <Text style={styles.deleteButtonText}>Excluir produto</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={20} color="#757575" />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    fontSize: 16,
    color: "#757575",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#212121",
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  statusIndicator: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  daysText: {
    fontSize: 14,
    fontWeight: "500",
  },
  imageContainer: {
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 20,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 40,
  },
  noImageText: {
    fontSize: 14,
    color: "#9E9E9E",
    marginTop: 8,
  },
  infoSection: {
    backgroundColor: "#fff",
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#9E9E9E",
    fontWeight: "500",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 15,
    color: "#212121",
    marginTop: 2,
  },
  actions: {
    marginTop: 24,
    paddingHorizontal: 16,
    gap: 12,
  },
  editButtonLarge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1565C0",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  deleteButtonText: {
    color: "#D32F2F",
    fontSize: 15,
    fontWeight: "500",
  },
});
