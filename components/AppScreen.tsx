import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ScreenAction = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  route?: string;
};

type ScreenSection = {
  title: string;
  description: string;
  items?: string[];
};

type AppScreenProps = {
  title: string;
  subtitle?: string;
  sections?: ScreenSection[];
  actions?: ScreenAction[];
};

export default function AppScreen({
  title,
  subtitle,
  sections = [],
  actions = [],
}: AppScreenProps) {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>

        {actions.length > 0 && (
          <View style={styles.actionGrid}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                style={styles.actionButton}
                onPress={() => {
                  if (action.onPress) {
                    action.onPress();
                    return;
                  }

                  if (action.route) {
                    router.push(action.route as never);
                  }
                }}
              >
                <Ionicons
                  name={action.icon ?? "add-circle-outline"}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.actionText}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.sectionStack}>
          {sections.map((section) => (
            <View key={section.title} style={styles.card}>
              <Text style={styles.cardTitle}>{section.title}</Text>
              <Text style={styles.cardDescription}>{section.description}</Text>

              {section.items?.map((item) => (
                <View key={item} style={styles.itemRow}>
                  <View style={styles.itemDot} />
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 62,
    paddingBottom: 180,
  },
  header: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    marginBottom: 24,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: "#aaa",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  actionButton: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  actionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionStack: {
    gap: 14,
  },
  card: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.075)",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  cardDescription: {
    color: "#c7c7c7",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 5,
  },
  itemDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#fff",
    opacity: 0.75,
  },
  itemText: {
    flex: 1,
    color: "#dedede",
    fontSize: 13,
    lineHeight: 18,
  },
});
