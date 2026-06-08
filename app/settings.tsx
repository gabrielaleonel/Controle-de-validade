import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppSettings } from "../src/types";
import { getSettings, saveSettings } from "../src/services/database";
import { getDeviceUuid } from "../src/services/device";
import { syncProducts } from "../src/services/apiClient";
import {
  requestNotificationPermissions,
  cancelAllNotifications,
} from "../src/services/notifications";

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>({
    notificacoesAtivas: true,
    alertaNotificacao: true,
    alertaEmail: false,
    userEmail: "",
    deviceUuid: "",
    diasAntecedencia: 7,
    googleApiKey: "",
    googleCx: "",
  });
  const [saving, setSaving] = useState(false);
  const [diasText, setDiasText] = useState("7");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      const uuid = await getDeviceUuid();
      setSettings({ ...data, deviceUuid: uuid });
      setDiasText(String(data.diasAntecedencia));
    } catch {
      const uuid = await getDeviceUuid();
      setSettings((prev) => ({ ...prev, deviceUuid: uuid }));
    }
  };

  const handleSave = async () => {
    const dias = parseInt(diasText, 10);
    if (isNaN(dias) || dias < 1) {
      Alert.alert("Validação", "A quantidade de dias deve ser maior que zero.");
      return;
    }

    setSaving(true);
    try {
      const newSettings: AppSettings = {
        ...settings,
        diasAntecedencia: dias,
      };
      await saveSettings(newSettings);

      if (newSettings.notificacoesAtivas) {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
          Alert.alert(
            "Permissão negada",
            "As notificações não funcionarão sem permissão. Ative nas configurações do dispositivo."
          );
        }
      }

      if (!newSettings.notificacoesAtivas) {
        await cancelAllNotifications();
      }

      if (newSettings.alertaEmail && newSettings.userEmail && newSettings.deviceUuid) {
        setSyncing(true);
        try {
          const { getAllProducts } = await import("../src/services/database");
          const allProducts = await getAllProducts();
          await syncProducts(
            newSettings.deviceUuid,
            newSettings.userEmail,
            allProducts
          );
        } catch {
          // Sync failure is non-blocking
        } finally {
          setSyncing(false);
        }
      }

      Alert.alert("Sucesso", "Configurações salvas!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Erro", "Não foi possível salvar as configurações.");
    } finally {
      setSaving(false);
    }
  };

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
        <Text style={styles.title}>Configurações</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificações</Text>
        <View style={styles.card}>
          <SettingRow
            icon="bell"
            label="Notificações ativas"
            description="Receber alertas sobre vencimento de produtos"
          >
            <Switch
              value={settings.notificacoesAtivas}
              onValueChange={(value) =>
                setSettings({ ...settings, notificacoesAtivas: value })
              }
              trackColor={{ false: "#E0E0E0", true: "#90CAF9" }}
              thumbColor={settings.notificacoesAtivas ? "#1565C0" : "#9E9E9E"}
            />
          </SettingRow>

          <View style={styles.divider} />

          <SettingRow
            icon="bell-ring"
            label="Alerta por notificação"
            description="Notificação local no celular"
          >
            <Switch
              value={settings.alertaNotificacao}
              onValueChange={(value) =>
                setSettings({ ...settings, alertaNotificacao: value })
              }
              trackColor={{ false: "#E0E0E0", true: "#90CAF9" }}
              thumbColor={settings.alertaNotificacao ? "#1565C0" : "#9E9E9E"}
            />
          </SettingRow>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Antecedência</Text>
        <View style={styles.card}>
          <View style={styles.diasRow}>
            <MaterialCommunityIcons name="calendar-clock" size={20} color="#757575" />
            <Text style={styles.diasLabel}>Alertar</Text>
            <TextInput
              style={styles.diasInput}
              value={diasText}
              onChangeText={setDiasText}
              keyboardType="number-pad"
              placeholderTextColor="#9E9E9E"
            />
            <Text style={styles.diasLabel}>dias antes</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>E-mail</Text>
        <View style={styles.card}>
          <SettingRow
            icon="email"
            label="Alerta por e-mail"
            description="Receber alertas de vencimento no e-mail"
          >
            <Switch
              value={settings.alertaEmail}
              onValueChange={(value) =>
                setSettings({ ...settings, alertaEmail: value })
              }
              trackColor={{ false: "#E0E0E0", true: "#90CAF9" }}
              thumbColor={settings.alertaEmail ? "#1565C0" : "#9E9E9E"}
            />
          </SettingRow>

          {settings.alertaEmail && (
            <>
              <View style={styles.divider} />
              <View style={styles.emailInputRow}>
                <MaterialCommunityIcons name="email-outline" size={20} color="#757575" />
                <TextInput
                  style={styles.emailInput}
                  placeholder="seu@email.com"
                  value={settings.userEmail}
                  onChangeText={(text) =>
                    setSettings({ ...settings, userEmail: text })
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#9E9E9E"
                />
              </View>
              <View style={styles.emailNote}>
                <MaterialCommunityIcons name="information-outline" size={16} color="#757575" />
                <Text style={styles.emailNoteText}>
                  Os produtos serão sincronizados com o servidor. Você receberá
                  até 3 e-mails por dia para cada produto próximo do vencimento.
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Busca automática</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={styles.settingRowHeader}>
                <MaterialCommunityIcons name="google" size={20} color="#1565C0" />
                <Text style={styles.settingLabel}>Google Custom Search</Text>
              </View>
              <Text style={styles.settingDescription}>
                API Key e CX para buscar produtos por código de barras
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.emailInputRow}>
            <MaterialCommunityIcons name="key-variant" size={20} color="#757575" />
            <TextInput
              style={styles.emailInput}
              placeholder="API Key"
              value={settings.googleApiKey || ""}
              onChangeText={(text) =>
                setSettings({ ...settings, googleApiKey: text })
              }
              autoCapitalize="none"
              placeholderTextColor="#9E9E9E"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.emailInputRow}>
            <MaterialCommunityIcons name="search-web" size={20} color="#757575" />
            <TextInput
              style={styles.emailInput}
              placeholder="CX (ID do mecanismo de busca)"
              value={settings.googleCx || ""}
              onChangeText={(text) =>
                setSettings({ ...settings, googleCx: text })
              }
              autoCapitalize="none"
              placeholderTextColor="#9E9E9E"
            />
          </View>
          <View style={styles.emailNote}>
            <MaterialCommunityIcons name="information-outline" size={16} color="#757575" />
            <Text style={styles.emailNoteText}>
              Opcional. Sem isso, a busca usa fontes gratuitas (Open Food Facts,
              UPCItemDB). Para configurar, crie uma API Key em
              https://console.cloud.google.com e um CX em
              https://cse.google.com/cse/
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, (saving || syncing) && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving || syncing}
      >
        <MaterialCommunityIcons
          name={syncing ? "sync" : "check"}
          size={20}
          color="#fff"
        />
        <Text style={styles.saveButtonText}>
          {syncing ? "Sincronizando..." : "Salvar configurações"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <View style={styles.settingRowHeader}>
          <MaterialCommunityIcons name={icon} size={20} color="#1565C0" />
          <Text style={styles.settingLabel}>{label}</Text>
        </View>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      {children}
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
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#424242",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#212121",
  },
  settingDescription: {
    fontSize: 12,
    color: "#9E9E9E",
    marginTop: 2,
    marginLeft: 28,
  },
  divider: {
    height: 1,
    backgroundColor: "#F5F5F5",
    marginHorizontal: 16,
  },
  emailInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  emailInput: {
    flex: 1,
    fontSize: 15,
    color: "#212121",
    paddingVertical: 4,
  },
  emailNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  emailNoteText: {
    flex: 1,
    fontSize: 12,
    color: "#757575",
    lineHeight: 16,
  },
  diasRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  diasLabel: {
    fontSize: 15,
    color: "#424242",
  },
  diasInput: {
    width: 50,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#1565C0",
    borderBottomWidth: 2,
    borderBottomColor: "#1565C0",
    paddingVertical: 2,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1565C0",
    marginHorizontal: 16,
    marginTop: 32,
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
});
