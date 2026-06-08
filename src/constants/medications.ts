export const MEDICATION_DATABASE_NAME = "medications.db";

export const MEDICATION_COLORS = {
  primary: "#8A1538",
  dark: "#6F0F2D",
  light: "#F8EAF0",
  text: "#222222",
  textSecondary: "#777777",
  background: "#F7F7F7",
  card: "#FFFFFF",
} as const;

export const MEDICATION_FORM_LABELS: Record<string, string> = {
  comprimido: "Comprimido",
  capsula: "Cápsula",
  gotas: "Gotas",
  ml: "ml",
  sache: "Sachê",
  ampola: "Ampola",
  outro: "Outro",
};

export const MEDICATION_FORM_OPTIONS = [
  { label: "Comprimido", value: "comprimido" as const },
  { label: "Cápsula", value: "capsula" as const },
  { label: "Gotas", value: "gotas" as const },
  { label: "ml", value: "ml" as const },
  { label: "Sachê", value: "sache" as const },
  { label: "Ampola", value: "ampola" as const },
  { label: "Outro", value: "outro" as const },
];

export const MEDICATION_STATUS_LABELS = {
  acabando: "Próximo de acabar",
  vencido: "Vencido",
  normal: "Normal",
} as const;

export const MEDICATION_STATUS_COLORS = {
  acabando: "#8A1538",
  vencido: "#D32F2F",
  normal: "#388E3C",
} as const;

export const MEDICATION_FILTER_OPTIONS = [
  { label: "Todos", value: "todos" as const },
  { label: "Próximos de acabar", value: "proximos_acabar" as const },
  { label: "Vencidos", value: "vencidos" as const },
];

export const DEFAULT_ALERTA_ACABAR_DIAS = [7, 3, 1];
export const DEFAULT_ALERTA_VALIDADE_DIAS = [30, 7, 1];
