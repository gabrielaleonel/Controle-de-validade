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
import {
  getProduct,
  insertProduct,
  updateProduct,
  deleteProduct,
  getProductByBarcode,
} from "../src/services/database";
import {
  scheduleExpiryNotification,
  cancelNotification,
} from "../src/services/notifications";
import { lookupProductByBarcode } from "../src/services/productLookup";
import BarcodeScanner from "../src/components/BarcodeScanner";
import PhotoPicker from "../src/components/PhotoPicker";

export default function AddProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;

  const [nome, setNome] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [notificacaoId, setNotificacaoId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const scannedRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const loadProduct = useCallback(async () => {
    if (!editId) return;
    try {
      const product = await getProduct(editId);
      if (product) {
        setNome(product.nome);
        setCodigoBarras(product.codigoBarras || "");
        setDataVencimento(formatDateParaInput(product.dataVencimento));
        setFotoUri(product.fotoUri);
        setObservacoes(product.observacoes || "");
        setNotificacaoId(product.notificacaoId);
        setIsEditing(true);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível carregar o produto.");
      router.back();
    }
  }, [editId, router]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  useEffect(() => {
    if (isEditing) return;
    if (scannedRef.current) {
      scannedRef.current = false;
      return;
    }

    const clean = codigoBarras.replace(/\s/g, "");
    if (clean.length < 8) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const existing = await getProductByBarcode(clean);
      if (existing) {
        Alert.alert(
          "Produto já cadastrado",
          `O produto "${existing.nome}" já está cadastrado com este código de barras.`,
          [{ text: "OK" }]
        );
        return;
      }

      setIsLoading(true);
      try {
        console.log("[AddProduct] Buscando produto com código de barras:", clean);
        const result = await lookupProductByBarcode(clean);
        if (result?.nome) {
          setNome(result.nome);
          if (result.imagem) {
            setFotoUri(prev => prev ?? result.imagem);
          }
        } else {
          console.log("[AddProduct] Nenhum produto encontrado para o código:", clean);
        }
      } catch (err) {
        console.log("[AddProduct] Erro ao buscar produto:", err);
      } finally {
        setIsLoading(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [codigoBarras, isEditing]);

  const handleBarcodeDetected = async (barcode: string) => {
    setShowScanner(false);
    scannedRef.current = true;
    setCodigoBarras(barcode);

    const existing = await getProductByBarcode(barcode);
    if (existing) {
      Alert.alert(
        "Produto já cadastrado",
        `O produto "${existing.nome}" já está cadastrado com este código de barras. Deseja editar o produto existente?`,
        [
          { text: "Cancelar", style: "cancel", onPress: () => router.back() },
          {
            text: "Editar",
            onPress: () =>
              router.replace(`/edit-product/${existing.id}`),
          },
        ]
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await lookupProductByBarcode(barcode);
      if (result && result.nome) {
          setNome(result.nome);
          if (result.imagem) {
            setFotoUri(prev => prev ?? result.imagem);
          }
      } else {
        Alert.alert(
          "Produto não encontrado",
          "Preencha o nome do produto manualmente."
        );
      }
    } catch {
      Alert.alert("Erro de conexão", "Não foi possível buscar o produto. Preencha manualmente.");
    } finally {
      setIsLoading(false);
    }
  };

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
    if (d.getDate() !== dia || d.getMonth() !== mes - 1 || d.getFullYear() !== ano) return null;
    return d.toISOString().split("T")[0];
  }

  const handleDateTextChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + "/" + digits.slice(2);
    if (digits.length > 4) formatted = formatted.slice(0, 5) + "/" + formatted.slice(5);
    setDataVencimento(formatted);
  };

  const validateForm = (): string | null => {
    if (!nome.trim()) {
      Alert.alert("Validação", "O nome do produto é obrigatório.");
      return null;
    }
    if (!dataVencimento.trim()) {
      Alert.alert("Validação", "A data de vencimento é obrigatória.");
      return null;
    }
    const parsed = parseDateBr(dataVencimento);
    if (!parsed) {
      Alert.alert("Validação", "Data de vencimento inválida. Use o formato DD/MM/AAAA.");
      return null;
    }
    return parsed;
  };

  const handleSave = async () => {
    const dataVencimentoStr = validateForm();
    if (!dataVencimentoStr) return;

    setSaving(true);
    try {
      if (isEditing && editId) {
        await updateProduct(editId, {
          nome: nome.trim(),
          codigoBarras: codigoBarras.trim() || null,
          dataVencimento: dataVencimentoStr,
          fotoUri,
          observacoes: observacoes.trim() || null,
        });

        if (notificacaoId) {
          await cancelNotification(notificacaoId).catch(() => {});
        }

        scheduleExpiryNotification(editId, nome.trim(), dataVencimentoStr)
          .then((newNotifId) => {
            if (newNotifId) {
              updateProduct(editId, { notificacaoId: newNotifId }).catch(() => {});
            }
          })
          .catch(() => {});

        Alert.alert("Sucesso", "Produto atualizado com sucesso!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        const newId = await insertProduct({
          nome: nome.trim(),
          codigoBarras: codigoBarras.trim() || null,
          dataVencimento: dataVencimentoStr,
          fotoUri,
          observacoes: observacoes.trim() || null,
          notificacaoId: null,
        });

        scheduleExpiryNotification(newId, nome.trim(), dataVencimentoStr)
          .then((newNotifId) => {
            if (newNotifId) {
              updateProduct(newId, { notificacaoId: newNotifId }).catch(() => {});
            }
          })
          .catch(() => {});

        Alert.alert("Sucesso", "Produto cadastrado com sucesso!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      Alert.alert("Erro", "Não foi possível salvar o produto.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editId) return;
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
              if (notificacaoId) {
                await cancelNotification(notificacaoId);
              }
              await deleteProduct(editId);
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isEditing ? "Editar produto" : "Novo produto"}
        </Text>
        <View style={styles.backButton} />
      </View>

      {isLoading && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator size="small" color="#1565C0" />
          <Text style={styles.loadingText}>Buscando produto...</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Foto do produto</Text>
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
            onChangeText={setCodigoBarras}
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
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Nome do produto <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Leite Integral"
          value={nome}
          onChangeText={setNome}
          placeholderTextColor="#9E9E9E"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Data de vencimento <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          value={dataVencimento}
          onChangeText={handleDateTextChange}
          keyboardType="numeric"
          placeholderTextColor="#9E9E9E"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Observações</Text>
        <TextInput
          style={[styles.input, styles.observacoesInput]}
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
            <ActivityIndicator color="#fff" />
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
            <MaterialCommunityIcons name="delete-outline" size={20} color="#D32F2F" />
            <Text style={styles.deleteButtonText}>Excluir produto</Text>
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
    backgroundColor: "#E3F2FD",
    paddingVertical: 10,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#1565C0",
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
  barcodeRow: {
    flexDirection: "row",
    gap: 8,
  },
  barcodeInput: {
    flex: 1,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#1565C0",
    justifyContent: "center",
    alignItems: "center",
  },
  observacoesInput: {
    minHeight: 80,
    paddingTop: 12,
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
    backgroundColor: "#1565C0",
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
