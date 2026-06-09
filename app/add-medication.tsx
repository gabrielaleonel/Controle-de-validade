import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MedicationForm } from "../src/types/medications";
import {
  getMedication,
  insertMedication,
  updateMedication,
  deleteMedication,
  getMedicationByBarcode,
} from "../src/services/medicationDatabase";
import {
  getBarcodeCache,
  setBarcodeCache,
} from "../src/services/barcodeCache";
import {
  scheduleMedicationNotifications,
  cancelMedicationNotifications,
} from "../src/services/medicationNotifications";
import { lookupMedicationByBarcode } from "../src/services/medicationLookup";
import { lookupProductByBarcode } from "../src/services/productLookup";
import { API_BASE_URL } from "../src/constants";
import { calculateEndDate } from "../src/utils/medicationCalculations";
import {
  MEDICATION_COLORS,
  MEDICATION_FORM_OPTIONS,
  MEDICATION_FORM_LABELS,
} from "../src/constants/medications";
import BarcodeScanner from "../src/components/BarcodeScanner";
import PhotoPicker from "../src/components/PhotoPicker";

export default function AddMedicationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;

  const [nome, setNome] = useState("");
  const [dosagem, setDosagem] = useState("");
  const [forma, setForma] = useState<MedicationForm>("comprimido");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [quantidadeEstoque, setQuantidadeEstoque] = useState("");
  const [quantidadePorDose, setQuantidadePorDose] = useState("");
  const [dosesPorDia, setDosesPorDia] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [posologia, setPosologia] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [notificacaoIdEstoque, setNotificacaoIdEstoque] = useState<string | null>(null);
  const [notificacaoIdValidade, setNotificacaoIdValidade] = useState<string | null>(null);
  const [showFormPicker, setShowFormPicker] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [barcodeSource, setBarcodeSource] = useState<string | null>(null);
  const [barcodeConfidence, setBarcodeConfidence] = useState<number | null>(null);
  const [barcodeLookupAt, setBarcodeLookupAt] = useState<string | null>(null);
  const scannedRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const loadMedication = useCallback(async () => {
    if (!editId) return;
    try {
      const medication = await getMedication(editId);
      if (medication) {
        setNome(medication.nome);
        setDosagem(medication.dosagem || "");
        setForma(medication.forma);
        setCodigoBarras(medication.codigoBarras || "");
        setFotoUri(medication.fotoUri);
        setQuantidadeEstoque(String(medication.quantidadeEstoque));
        setQuantidadePorDose(String(medication.quantidadePorDose));
        setDosesPorDia(String(medication.dosesPorDia));
        setDataVencimento(formatDateParaInput(medication.dataVencimento));
        setPosologia(medication.posologia || "");
        setObservacoes(medication.observacoes || "");
        setNotificacaoIdEstoque(medication.notificacaoIdEstoque);
        setNotificacaoIdValidade(medication.notificacaoIdValidade);
        setIsEditing(true);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível carregar o medicamento.");
      router.back();
    }
  }, [editId, router]);

  useEffect(() => {
    loadMedication();
  }, [loadMedication]);

  useEffect(() => {
    const cleanBarcode = codigoBarras.replace(/\D/g, "");
    if (cleanBarcode.length < 8) return;

    const timer = setTimeout(async () => {
      try {
        console.log("[TELA] Buscando medicamento:", cleanBarcode);
        const result = await lookupProductByBarcode(cleanBarcode);
        console.log("[TELA] Resultado da busca:", result);

        if (!result) {
          console.log("[TELA] Nenhum medicamento encontrado");
          return;
        }

        if (result.nome) {
          setNome(result.nome);
        }

        if (result.imagem) {
          setFotoUri(result.imagem);
        }

        const dosagem = extrairDosagem(result.nome);
        if (dosagem) {
          setDosagem(dosagem);
        }
      } catch (error) {
        console.log("[TELA] Erro ao buscar medicamento:", error);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [codigoBarras]);

  async function buscarMedicamentoPorCodigo(barcode: string): Promise<boolean> {
    const clean = barcode.replace(/\D/g, "");
    if (clean.length < 8 || clean.length > 14) return false;

    try {
      console.log("[TELA] Buscando medicamento:", clean);
      const result = await lookupProductByBarcode(clean);
      console.log("[TELA] Resultado da busca:", result);

      if (!result?.nome) {
        console.log("[TELA] Nenhum medicamento encontrado");
        return false;
      }

      setNome(result.nome);
      if (result.imagem) {
        setFotoUri(result.imagem);
      }
      const dosagem = extrairDosagem(result.nome);
      if (dosagem) {
        setDosagem(dosagem);
      }
      return true;
    } catch (error) {
      console.log("[TELA] Erro ao buscar medicamento:", error);
      return false;
    }
  }

  const handleBarcodeDetected = async (barcode: string) => {
    setShowScanner(false);
    scannedRef.current = true;
    setCodigoBarras(barcode);
    setBarcodeSource(null);
    setBarcodeConfidence(null);
    setBarcodeLookupAt(null);

    const existing = await getMedicationByBarcode(barcode);
    if (existing) {
      Alert.alert(
        "Medicamento já cadastrado",
        `O medicamento "${existing.nome}" já está cadastrado com este código de barras. Deseja editar o medicamento existente?`,
        [
          { text: "Cancelar", style: "cancel", onPress: () => router.back() },
          {
            text: "Editar",
            onPress: () =>
              router.replace(`/edit-medication/${existing.id}`),
          },
        ]
      );
      return;
    }

    const cached = await getBarcodeCache(barcode);
    if (cached) {
      setNome(cached.nome);
      if (cached.fotoUri) {
        setFotoUri(cached.fotoUri);
      }
      setBarcodeSource("cache-local");
      setBarcodeConfidence(null);
      setBarcodeLookupAt(new Date().toISOString());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const found = await buscarMedicamentoPorCodigo(barcode);
    if (found) {
      setBarcodeSource("product-lookup-pharmacy");
      setBarcodeLookupAt(new Date().toISOString());
      setIsLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(
        `${API_BASE_URL}/api/medications/lookup-barcode?barcode=${encodeURIComponent(barcode)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        if (data.found && data.medication?.name) {
          setNome(data.medication.name);
          if (data.medication.dosage) {
            setDosagem(data.medication.dosage);
          }
          if (data.medication.form) {
            setForma(data.medication.form as MedicationForm);
          }
          if (data.medication.imagem) {
            setFotoUri(data.medication.imagem);
          }
          setBarcodeSource(data.source || null);
          setBarcodeConfidence(data.confidence ?? null);
          setBarcodeLookupAt(new Date().toISOString());
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // backend lookup failed, fall through to local fallback
    }

    try {
      const result = await lookupMedicationByBarcode(barcode);
      if (result && result.nome) {
        setNome(result.nome);
        if (result.imagem) {
          setFotoUri(prev => prev ?? result.imagem ?? null);
        }
        setBarcodeSource("fallback");
        setBarcodeConfidence(null);
        setBarcodeLookupAt(new Date().toISOString());
      } else {
        Alert.alert(
          "Medicamento não encontrado",
          "Preencha o nome do medicamento manualmente."
        );
      }
    } catch {
      Alert.alert("Erro de conexão", "Não foi possível buscar o medicamento. Preencha manualmente.");
    } finally {
      setIsLoading(false);
    }
  };

  function extrairDosagem(nome: string): string {
    const match = nome.match(/\b\d+(?:[,.]\d+)?\s?(mg|g|mcg|µg|ml|mL|UI)\b/i);
    return match ? match[0].replace(",", ".") : "";
  }

  function formatDateParaInput(isoDate: string): string {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("pt-BR");
  }

  function parseDateBr(dateStr: string): string | null {
    if (!dateStr) return null;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    const [dia, mes, ano] = parts.map(Number);
    if (isNaN(dia) || isNaN(mes) || isNaN(ano)) return null;
    const d = new Date(ano, mes - 1, dia);
    if (
      d.getDate() !== dia ||
      d.getMonth() !== mes - 1 ||
      d.getFullYear() !== ano
    )
      return null;
    return d.toISOString().split("T")[0];
  }

  const handleDateTextChange = (
    text: string,
    setter: (val: string) => void
  ) => {
    const digits = text.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 2)
      formatted = digits.slice(0, 2) + "/" + digits.slice(2);
    if (digits.length > 4)
      formatted = formatted.slice(0, 5) + "/" + formatted.slice(5);
    setter(formatted);
  };

  const getEstimatedEndDate = (): Date | null => {
    const qtd = parseInt(quantidadeEstoque, 10);
    const dose = parseInt(quantidadePorDose, 10);
    const dia = parseInt(dosesPorDia, 10);
    if (isNaN(qtd) || isNaN(dose) || isNaN(dia)) return null;
    if (qtd <= 0 || dose <= 0 || dia <= 0) return null;
    const result = calculateEndDate({
      quantidadeEstoque: qtd,
      quantidadePorDose: dose,
      dosesPorDia: dia,
    });
    return result.dataPrevistaAcabar;
  };

  const estimatedEndDate = getEstimatedEndDate();

  const validateForm = (): string | null => {
    if (!nome.trim()) {
      Alert.alert("Validação", "O nome do medicamento é obrigatório.");
      return null;
    }
    if (!quantidadeEstoque.trim()) {
      Alert.alert("Validação", "A quantidade em estoque é obrigatória.");
      return null;
    }
    if (isNaN(parseInt(quantidadeEstoque, 10)) || parseInt(quantidadeEstoque, 10) < 1) {
      Alert.alert("Validação", "A quantidade em estoque deve ser um número maior que zero.");
      return null;
    }
    if (!quantidadePorDose.trim()) {
      Alert.alert("Validação", "A quantidade por dose é obrigatória.");
      return null;
    }
    if (isNaN(parseInt(quantidadePorDose, 10)) || parseInt(quantidadePorDose, 10) < 1) {
      Alert.alert("Validação", "A quantidade por dose deve ser um número maior que zero.");
      return null;
    }
    if (!dosesPorDia.trim()) {
      Alert.alert("Validação", "As doses por dia são obrigatórias.");
      return null;
    }
    if (isNaN(parseInt(dosesPorDia, 10)) || parseInt(dosesPorDia, 10) < 1) {
      Alert.alert("Validação", "As doses por dia devem ser um número maior que zero.");
      return null;
    }
    if (!dataVencimento.trim()) {
      Alert.alert("Validação", "A data de validade é obrigatória.");
      return null;
    }
    const parsed = parseDateBr(dataVencimento);
    if (!parsed) {
      Alert.alert(
        "Validação",
        "Data de validade inválida. Use o formato DD/MM/AAAA."
      );
      return null;
    }
    return parsed;
  };

  const saveBarcodeToCache = async () => {
    if (!codigoBarras.trim() || !barcodeSource) return;
    try {
      await fetch(`${API_BASE_URL}/api/medications/barcode-cache`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: codigoBarras.trim(),
          name: nome.trim(),
          dosage: dosagem.trim() || undefined,
          form: forma,
          source: barcodeSource,
          confidence: barcodeConfidence ?? undefined,
        }),
      });
    } catch {
      // non-critical; swallow silently
    }
  };

  const handleSave = async () => {
    const dataVencimentoStr = validateForm();
    if (!dataVencimentoStr) return;

    setSaving(true);
    try {
      const qtd = parseInt(quantidadeEstoque, 10);
      const dose = parseInt(quantidadePorDose, 10);
      const dia = parseInt(dosesPorDia, 10);
      const consumoDiario = dose * dia;
      const dataPrevistaAcabar = estimatedEndDate
        ? estimatedEndDate.toISOString().split("T")[0]
        : null;

      if (isEditing && editId) {
        await cancelMedicationNotifications(
          notificacaoIdEstoque,
          notificacaoIdValidade
        );

        await updateMedication(editId, {
          nome: nome.trim(),
          dosagem: dosagem.trim() || null,
          forma,
          codigoBarras: codigoBarras.trim() || null,
          fotoUri,
          barcodeSource,
          barcodeConfidence,
          barcodeLookupAt,
          quantidadeEstoque: qtd,
          quantidadePorDose: dose,
          dosesPorDia: dia,
          consumoDiario,
          dataVencimento: dataVencimentoStr,
          dataPrevistaAcabar,
          posologia: posologia.trim() || null,
          observacoes: observacoes.trim() || null,
        });

        if (codigoBarras.trim()) {
          setBarcodeCache(
            codigoBarras.trim(),
            nome.trim(),
            fotoUri
          );
        }

        scheduleMedicationNotifications(
          editId,
          nome.trim(),
          dataVencimentoStr,
          dataPrevistaAcabar
        ).then((ids) => {
          updateMedication(editId, {
            notificacaoIdEstoque: ids.notificacaoIdEstoque,
            notificacaoIdValidade: ids.notificacaoIdValidade,
          }).catch(() => {});
        });

        Alert.alert("Sucesso", "Medicamento atualizado com sucesso!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        const newId = await insertMedication({
          nome: nome.trim(),
          dosagem: dosagem.trim() || null,
          forma,
          codigoBarras: codigoBarras.trim() || null,
          fotoUri,
          barcodeSource,
          barcodeConfidence,
          barcodeLookupAt,
          quantidadeEstoque: qtd,
          quantidadePorDose: dose,
          dosesPorDia: dia,
          consumoDiario,
          dataVencimento: dataVencimentoStr,
          dataPrevistaAcabar,
          posologia: posologia.trim() || null,
          observacoes: observacoes.trim() || null,
          notificacaoIdEstoque: null,
          notificacaoIdValidade: null,
        });

        scheduleMedicationNotifications(
          newId,
          nome.trim(),
          dataVencimentoStr,
          dataPrevistaAcabar
        ).then((ids) => {
          updateMedication(newId, {
            notificacaoIdEstoque: ids.notificacaoIdEstoque,
            notificacaoIdValidade: ids.notificacaoIdValidade,
          }).catch(() => {});
        });

        saveBarcodeToCache();

        if (codigoBarras.trim()) {
          setBarcodeCache(
            codigoBarras.trim(),
            nome.trim(),
            fotoUri
          );
        }

        Alert.alert("Sucesso", "Medicamento cadastrado com sucesso!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      Alert.alert("Erro", "Não foi possível salvar o medicamento.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editId) return;
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
                notificacaoIdEstoque,
                notificacaoIdValidade
              );
              await deleteMedication(editId);
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

  if (showScanner) {
    return (
      <BarcodeScanner
        onBarcodeScanned={handleBarcodeDetected}
        onClose={() => setShowScanner(false)}
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isEditing ? "Editar medicamento" : "Novo medicamento"}
        </Text>
        <View style={styles.backButton} />
      </View>

      {isLoading && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator size="small" color={MEDICATION_COLORS.primary} />
          <Text style={styles.loadingText}>Buscando medicamento...</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Foto do medicamento</Text>
        <PhotoPicker
          fotoUri={fotoUri}
          onPhotoSelected={setFotoUri}
          onPhotoRemoved={() => setFotoUri(null)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Código de barras</Text>
        <View style={styles.barcodeRow}>
          <TextInput
            style={[styles.input, styles.barcodeInput]}
            placeholder="Digite o código de barras"
            value={codigoBarras}
            onChangeText={(text) => {
              console.log("[TELA] Código digitado:", text);
              setCodigoBarras(text);
            }}
            keyboardType="numeric"
            placeholderTextColor="#9E9E9E"
          />
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setShowScanner(true)}
          >
            <MaterialCommunityIcons name="barcode-scan" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        {barcodeSource && (
          <View style={styles.barcodeBadge}>
            <MaterialCommunityIcons name="check-circle" size={14} color="#4CAF50" />
            <Text style={styles.barcodeBadgeText}>
              Encontrado em {barcodeSource}
              {barcodeConfidence !== null
                ? ` (${(barcodeConfidence * 100).toFixed(0)}%)`
                : ""}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Nome do medicamento <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Amitriptilina"
          value={nome}
          onChangeText={setNome}
          placeholderTextColor="#9E9E9E"
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowHalf}>
          <Text style={styles.sectionTitle}>Dosagem</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 25mg"
            value={dosagem}
            onChangeText={setDosagem}
            placeholderTextColor="#9E9E9E"
          />
        </View>
        <View style={styles.rowHalf}>
          <Text style={styles.sectionTitle}>Forma</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowFormPicker(!showFormPicker)}
          >
            <Text style={styles.pickerText}>
              {MEDICATION_FORM_LABELS[forma] || "Selecionar"}
            </Text>
            <MaterialCommunityIcons
              name={showFormPicker ? "chevron-up" : "chevron-down"}
              size={20}
              color="#616161"
            />
          </TouchableOpacity>
          {showFormPicker && (
            <View style={styles.pickerDropdown}>
              {MEDICATION_FORM_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.pickerOption,
                    forma === opt.value && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    setForma(opt.value);
                    setShowFormPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      forma === opt.value && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {forma === opt.value && (
                    <MaterialCommunityIcons
                      name="check"
                      size={18}
                      color={MEDICATION_COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Quantidade em estoque <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 15"
          value={quantidadeEstoque}
          onChangeText={setQuantidadeEstoque}
          keyboardType="numeric"
          placeholderTextColor="#9E9E9E"
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowHalf}>
          <Text style={styles.sectionTitle}>
            Quantidade por dose <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 1"
            value={quantidadePorDose}
            onChangeText={setQuantidadePorDose}
            keyboardType="numeric"
            placeholderTextColor="#9E9E9E"
          />
        </View>
        <View style={styles.rowHalf}>
          <Text style={styles.sectionTitle}>
            Doses por dia <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 1"
            value={dosesPorDia}
            onChangeText={setDosesPorDia}
            keyboardType="numeric"
            placeholderTextColor="#9E9E9E"
          />
        </View>
      </View>

      {estimatedEndDate && (
        <View style={styles.estimateBanner}>
          <MaterialCommunityIcons
            name="calendar-clock"
            size={18}
            color={MEDICATION_COLORS.primary}
          />
          <Text style={styles.estimateText}>
            Previsão de término: {estimatedEndDate.toLocaleDateString("pt-BR")}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Data de validade <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          value={dataVencimento}
          onChangeText={(text) => handleDateTextChange(text, setDataVencimento)}
          keyboardType="numeric"
          placeholderTextColor="#9E9E9E"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Posologia</Text>
        <TextInput
          style={[styles.input, styles.posologiaInput]}
          placeholder="Ex: Tomar 1 comprimido à noite"
          value={posologia}
          onChangeText={setPosologia}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          placeholderTextColor="#9E9E9E"
        />
        <Text style={styles.disclaimer}>
          Cadastre a posologia conforme orientação do seu médico ou profissional
          de saúde.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Observações</Text>
        <TextInput
          style={[styles.input, styles.posologiaInput]}
          placeholder="Informações adicionais..."
          value={observacoes}
          onChangeText={setObservacoes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          placeholderTextColor="#9E9E9E"
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Text style={styles.saveButtonText}>Salvando...</Text>
          ) : (
            <>
              <MaterialCommunityIcons name="check" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>
                {isEditing ? "Atualizar" : "Salvar"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <MaterialCommunityIcons
              name="delete-outline"
              size={20}
              color="#D32F2F"
            />
            <Text style={styles.deleteButtonText}>Excluir medicamento</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
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
  loadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8EAF0",
    paddingVertical: 10,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: MEDICATION_COLORS.primary,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#424242",
    marginBottom: 8,
  },
  required: {
    color: "#D32F2F",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#212121",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  row: {
    flexDirection: "row",
    marginTop: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowHalf: {
    flex: 1,
  },
  barcodeRow: {
    flexDirection: "row",
    gap: 8,
  },
  barcodeInput: {
    flex: 1,
  },
  barcodeBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  barcodeBadgeText: {
    fontSize: 13,
    color: "#4CAF50",
    fontWeight: "500",
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: MEDICATION_COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerButton: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#212121",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerText: {
    fontSize: 15,
    color: "#212121",
  },
  pickerDropdown: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  pickerOptionSelected: {
    backgroundColor: "#F8EAF0",
  },
  pickerOptionText: {
    fontSize: 15,
    color: "#212121",
  },
  pickerOptionTextSelected: {
    color: MEDICATION_COLORS.primary,
    fontWeight: "600",
  },
  estimateBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8EAF0",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  estimateText: {
    fontSize: 14,
    color: MEDICATION_COLORS.primary,
    fontWeight: "500",
  },
  posologiaInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  disclaimer: {
    fontSize: 12,
    color: "#777777",
    fontStyle: "italic",
    marginTop: 6,
    lineHeight: 16,
  },
  actions: {
    marginTop: 32,
    paddingHorizontal: 16,
    gap: 12,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MEDICATION_COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
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
