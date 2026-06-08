import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MedicationWithStatus } from "../types/medications";
import {
  MEDICATION_COLORS,
  MEDICATION_FORM_LABELS,
  MEDICATION_STATUS_LABELS,
  MEDICATION_STATUS_COLORS,
} from "../constants/medications";
import { formatDate } from "../utils/medicationUtils";

interface MedicationCardProps {
  medication: MedicationWithStatus;
  onPress: (medication: MedicationWithStatus) => void;
}

export default function MedicationCard({ medication, onPress }: MedicationCardProps) {
  const showEstoqueAlerta =
    medication.statusEstoque === "acabando" && medication.diasRestantesEstoque !== null;
  const showValidadeAlerta = medication.statusValidade === "vencido" || medication.statusValidade === "acabando";

  return (
    <TouchableOpacity
      style={[
        styles.card,
        medication.statusValidade === "vencido" && styles.vencido,
      ]}
      onPress={() => onPress(medication)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {medication.fotoUri ? (
          <Image source={{ uri: medication.fotoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <MaterialCommunityIcons name="pill" size={28} color={MEDICATION_COLORS.primary} />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.nome} numberOfLines={1}>
          {medication.nome}
        </Text>
        <Text style={styles.subInfo}>
          {medication.dosagem && `${medication.dosagem} • `}
          {MEDICATION_FORM_LABELS[medication.forma] || medication.forma}
        </Text>
        {medication.codigoBarras && (
          <Text style={styles.codigo} numberOfLines={1}>
            {medication.codigoBarras}
          </Text>
        )}
        <Text style={styles.data}>Vence: {formatDate(medication.dataVencimento)}</Text>

        <View style={styles.statusRow}>
          {showEstoqueAlerta && (
            <View style={[styles.statusBadge, { backgroundColor: MEDICATION_STATUS_COLORS.acabando }]}>
              <Text style={styles.statusText}>{MEDICATION_STATUS_LABELS.acabando}</Text>
            </View>
          )}
          {showValidadeAlerta && medication.statusValidade === "vencido" && (
            <View style={[styles.statusBadge, { backgroundColor: MEDICATION_STATUS_COLORS.vencido }]}>
              <Text style={styles.statusText}>{MEDICATION_STATUS_LABELS.vencido}</Text>
            </View>
          )}
        </View>

        {medication.diasRestantesEstoque !== null && medication.diasRestantesEstoque > 0 && (
          <Text style={[styles.diasEstoque, { color: MEDICATION_COLORS.primary }]}>
            Acaba em {medication.diasRestantesEstoque} dia(s)
          </Text>
        )}
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
  iconContainer: {
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
    backgroundColor: "#F8EAF0",
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
  subInfo: {
    fontSize: 13,
    color: "#616161",
    marginTop: 2,
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
    gap: 6,
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
  diasEstoque: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
});
