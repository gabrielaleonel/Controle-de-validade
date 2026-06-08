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
import {
  useRouter,
  useLocalSearchParams,
  useFocusEffect,
} from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MedicationWithStatus } from "../../src/types/medications";
import { getMedication, deleteMedication } from "../../src/services/medicationDatabase";
import { cancelMedicationNotifications } from "../../src/services/medicationNotifications";
import { enrichMedication, formatDate } from "../../src/utils/medicationUtils";
import {
  MEDICATION_COLORS,
  MEDICATION_FORM_LABELS,
  MEDICATION_STATUS_LABELS,
  MEDICATION_STATUS_COLORS,
} from "../../src/constants/medications";

export default function MedicationDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [medication, setMedication] = useState<MedicationWithStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMedication = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getMedication(Number(id));
      if (data) {
        setMedication(enrichMedication(data));
      }
    } catch {
      Alert.alert("Erro", "Não foi possível carregar o medicamento.");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadMedication();
    }, [loadMedication])
  );

  const handleDelete = () => {
    if (!medication) return;
    Alert.alert(
      "Excluir medicamento",
      "Tem certeza que deseja excluir este medicamento? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelMedicationNotifications(
                medication.notificacaoIdEstoque,
                medication.notificacaoIdValidade
              );
              await deleteMedication(medication.id);
              Alert.alert("Sucesso", "Medicamento excluído.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch {
              Alert.alert("Erro", "Não foi possível excluir o medicamento.");
            }
          },
        },
      ]
    );
  };

  if (loading || !medication) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  const showEstoqueAlerta =
    medication.statusEstoque === "acabando" && medication.diasRestantesEstoque !== null;
  const showVencidoAlerta = medication.statusValidade === "vencido";

  const validadeDaysText =
    medication.diasRestantesValidade < 0
      ? `Vencido há ${Math.abs(medication.diasRestantesValidade)} dia(s)`
      : medication.diasRestantesValidade === 0
      ? "Vence hoje"
      : `${medication.diasRestantesValidade} dia(s) restantes`;

  const estoqueDaysText =
    medication.diasRestantesEstoque !== null
      ? medication.diasRestantesEstoque <= 0
        ? "Estoque acabou"
        : `Acaba em ${medication.diasRestantesEstoque} dia(s)`
      : null;

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
          onPress={() => router.push(`/edit-medication/${medication.id}`)}
          style={styles.editButton}
        >
          <MaterialCommunityIcons name="pencil" size={22} color={MEDICATION_COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        {medication.fotoUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: medication.fotoUri }} style={styles.image} />
          </View>
        ) : (
          <View style={styles.iconLarge}>
            <MaterialCommunityIcons name="pill" size={40} color={MEDICATION_COLORS.primary} />
          </View>
        )}
        <Text style={styles.medicationName}>{medication.nome}</Text>
        <Text style={styles.medicationSub}>
          {medication.dosagem && `${medication.dosagem} • `}
          {MEDICATION_FORM_LABELS[medication.forma] || medication.forma}
        </Text>
      </View>

      <View style={styles.alertBanner}>
        {showEstoqueAlerta && (
          <View style={[styles.alertBadge, { backgroundColor: MEDICATION_STATUS_COLORS.acabando }]}>
            <MaterialCommunityIcons name="alert" size={14} color="#fff" />
            <Text style={styles.alertText}>{MEDICATION_STATUS_LABELS.acabando}</Text>
          </View>
        )}
        {showVencidoAlerta && (
          <View style={[styles.alertBadge, { backgroundColor: MEDICATION_STATUS_COLORS.vencido }]}>
            <MaterialCommunityIcons name="alert" size={14} color="#fff" />
            <Text style={styles.alertText}>{MEDICATION_STATUS_LABELS.vencido}</Text>
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        {medication.codigoBarras && (
          <InfoRow
            icon="barcode"
            label="Código de barras"
            value={medication.codigoBarras}
          />
        )}
        <InfoRow
          icon="pill"
          label="Dosagem"
          value={medication.dosagem || "---"}
        />
        <InfoRow
          icon="shape"
          label="Forma"
          value={MEDICATION_FORM_LABELS[medication.forma] || medication.forma}
        />
        <InfoRow
          icon="package-variant"
          label="Quantidade em estoque"
          value={`${medication.quantidadeEstoque}`}
        />
        <InfoRow
          icon="counter"
          label="Quantidade por dose"
          value={`${medication.quantidadePorDose}`}
        />
        <InfoRow
          icon="calendar-sync"
          label="Doses por dia"
          value={`${medication.dosesPorDia}`}
        />
        <InfoRow
          icon="chart-line"
          label="Consumo diário"
          value={`${medication.consumoDiario}`}
        />
        <InfoRow
          icon="calendar"
          label="Data de validade"
          value={formatDate(medication.dataVencimento)}
          valueColor={
            medication.statusValidade === "vencido"
              ? MEDICATION_STATUS_COLORS.vencido
              : undefined
          }
          extra={validadeDaysText}
          extraColor={
            medication.statusValidade === "vencido"
              ? MEDICATION_STATUS_COLORS.vencido
              : MEDICATION_COLORS.primary
          }
        />
        <InfoRow
          icon="calendar-end"
          label="Previsão de término"
          value={
            medication.dataPrevistaAcabar
              ? formatDate(medication.dataPrevistaAcabar)
              : "---"
          }
          extra={estoqueDaysText}
          extraColor={MEDICATION_COLORS.primary}
        />
        {medication.posologia && (
          <InfoRow
            icon="note-text"
            label="Posologia"
            value={medication.posologia}
            multiline
          />
        )}
        {medication.observacoes && (
          <InfoRow
            icon="comment"
            label="Observações"
            value={medication.observacoes}
            multiline
          />
        )}
        <InfoRow
          icon="clock-outline"
          label="Cadastrado em"
          value={formatDate(medication.criadoEm)}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButtonLarge}
          onPress={() => router.push(`/edit-medication/${medication.id}`)}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
          <Text style={styles.editButtonText}>Editar medicamento</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <MaterialCommunityIcons name="delete-outline" size={20} color="#D32F2F" />
          <Text style={styles.deleteButtonText}>Excluir medicamento</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueColor,
  extra,
  extraColor,
  multiline,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
  extra?: string | null;
  extraColor?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={20} color="#757575" />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text
          style={[styles.infoValue, valueColor ? { color: valueColor } : undefined]}
          numberOfLines={multiline ? undefined : 2}
        >
          {value}
        </Text>
        {extra && (
          <Text
            style={[styles.infoExtra, extraColor ? { color: extraColor } : undefined]}
          >
            {extra}
          </Text>
        )}
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
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  iconLarge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#F8EAF0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  imageContainer: {
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 8,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    marginBottom: 12,
  },
  medicationName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#212121",
    textAlign: "center",
  },
  medicationSub: {
    fontSize: 14,
    color: "#616161",
    marginTop: 4,
  },
  alertBanner: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff",
    gap: 8,
  },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  alertText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
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
  infoExtra: {
    fontSize: 13,
    fontWeight: "500",
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
    backgroundColor: MEDICATION_COLORS.primary,
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
