import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { FilterType } from "../types";
import { FILTER_OPTIONS } from "../constants";

interface FilterBarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export default function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  return (
    <View style={styles.container}>
      {FILTER_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.filterButton,
            activeFilter === option.value && styles.filterButtonActive,
          ]}
          onPress={() => onFilterChange(option.value)}
        >
          <Text
            style={[
              styles.filterText,
              activeFilter === option.value && styles.filterTextActive,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  filterButtonActive: {
    backgroundColor: "#1565C0",
  },
  filterText: {
    fontSize: 13,
    color: "#616161",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#fff",
  },
});
