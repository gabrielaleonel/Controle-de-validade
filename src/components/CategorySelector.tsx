import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MEDICATION_COLORS } from "../constants/medications";

export interface CategoryOption {
  id: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const CATEGORIES: CategoryOption[] = [
  { id: "alimentos", label: "Alimentos", icon: "silverware-fork-knife" },
  { id: "remedio", label: "Remédio", icon: "pill" },
];

interface CategorySelectorProps {
  selected: string;
  onSelect: (id: string) => void;
}

export default function CategorySelector({ selected, onSelect }: CategorySelectorProps) {
  const [open, setOpen] = useState(false);

  const current = CATEGORIES.find((c) => c.id === selected) ?? CATEGORIES[0];
  const isMedication = selected === "remedio";
  const accentColor = isMedication ? MEDICATION_COLORS.primary : "#1565C0";

  return (
    <>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name={current.icon} size={22} color={accentColor} />
        <Text style={[styles.selectorText, { color: accentColor }]}>
          {current.label}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={accentColor} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={[styles.dropdown, isMedication && { borderColor: MEDICATION_COLORS.primary }]}>
            {CATEGORIES.map((cat) => {
              const isSelected = cat.id === selected;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.option,
                    isSelected && isMedication && styles.optionSelectedMedication,
                    isSelected && !isMedication && styles.optionSelectedFood,
                    cat.id === "alimentos" && styles.optionBorderBottom,
                  ]}
                  onPress={() => {
                    onSelect(cat.id);
                    setOpen(false);
                  }}
                >
                  <View style={styles.optionLeft}>
                    <MaterialCommunityIcons
                      name={cat.icon}
                      size={20}
                      color={isSelected ? (isMedication ? MEDICATION_COLORS.primary : "#1565C0") : "#616161"}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && { color: isMedication ? MEDICATION_COLORS.primary : "#1565C0", fontWeight: "600" },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={isMedication ? MEDICATION_COLORS.primary : "#1565C0"}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectorText: {
    fontSize: 18,
    fontWeight: "700",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 14,
    width: 240,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionSelectedMedication: {
    backgroundColor: "#F8EAF0",
  },
  optionSelectedFood: {
    backgroundColor: "#E3F2FD",
  },
  optionBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionText: {
    fontSize: 16,
    color: "#222222",
  },
});
