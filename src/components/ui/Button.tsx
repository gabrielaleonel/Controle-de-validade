import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  View,
} from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "google";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export default function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const isOutline = variant === "outline";
  const isGoogle = variant === "google";

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isOutline && styles.buttonOutline,
        isGoogle && styles.buttonGoogle,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isOutline ? "#1565C0" : "#fff"}
        />
      ) : (
        <>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text
            style={[
              styles.text,
              isOutline && styles.textOutline,
              isGoogle && styles.textGoogle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1565C0",
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 24,
  },
  iconWrapper: {
    marginRight: 8,
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#1565C0",
  },
  buttonGoogle: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#DADCE0",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  textOutline: {
    color: "#1565C0",
  },
  textGoogle: {
    color: "#3C4043",
  },
});
