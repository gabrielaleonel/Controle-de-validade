import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ProductWithStatus } from "../types";
import { STATUS_COLORS, STATUS_LABELS } from "../constants";
import { formatDate } from "../utils";

interface ProductCardProps {
  product: ProductWithStatus;
  onPress: (product: ProductWithStatus) => void;
}

export default function ProductCard({ product, onPress }: ProductCardProps) {
  const statusColor = STATUS_COLORS[product.status];
  const statusLabel = STATUS_LABELS[product.status];

  const daysText =
    product.diasRestantes < 0
      ? `Vencido há ${Math.abs(product.diasRestantes)} dia(s)`
      : product.diasRestantes === 0
      ? "Vence hoje"
      : `${product.diasRestantes} dia(s)`;

  return (
    <TouchableOpacity
      style={[styles.card, product.status === "vencido" && styles.vencido]}
      onPress={() => onPress(product)}
      activeOpacity={0.7}
    >
      <View style={styles.photoContainer}>
        {product.fotoUri ? (
          <Image source={{ uri: product.fotoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={28}
              color="#9E9E9E"
            />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.nome} numberOfLines={1}>
          {product.nome}
        </Text>
        {product.codigoBarras && (
          <Text style={styles.codigo} numberOfLines={1}>
            {product.codigoBarras}
          </Text>
        )}
        <Text style={styles.data}>Vence: {formatDate(product.dataVencimento)}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
          <Text style={[styles.dias, { color: statusColor }]}>{daysText}</Text>
        </View>
      </View>

      <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  vencido: {
    opacity: 0.75,
    backgroundColor: "#FFF5F5",
    borderLeftWidth: 3,
    borderLeftColor: "#D32F2F",
  },
  photoContainer: {
    marginRight: 12,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  photoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  nome: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
  },
  codigo: {
    fontSize: 12,
    color: "#9E9E9E",
    marginTop: 2,
  },
  data: {
    fontSize: 13,
    color: "#616161",
    marginTop: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  dias: {
    fontSize: 12,
    fontWeight: "500",
  },
});
