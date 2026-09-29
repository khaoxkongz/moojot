import { useQuery } from "@tanstack/react-query";
import { router, useIsFocused } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { HomeIcon } from "@/components/ui/home-icon";
import { Text } from "@/components/ui/typography";
import { SettingsPage, settingsPageStyles } from "@/features/settings/components/settings-page";
import { walletsQueryOptions } from "@/features/wallets/query-options";

type SavedCard = { cardName: string; cardLast4: string | null };

const NAVY = "#0B243B";
const PANEL = "#1D384F";
const BLUE = "#1377F8";
const YELLOW = "#FFDA60";
const MUTED = "#A9B8C8";

function CreditCardGlyph({ color = BLUE, size = 27 }: { color?: string; size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Rect x="3" y="7" width="26" height="18" rx="2" fill="none" stroke={color} strokeWidth="2" />
      <Path d="M3 13h26M7 20h6" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function HouseGlyph({ color }: { color: string }) {
  return (
    <Svg
      width={23}
      height={23}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d="M3 11 12 3l9 8v10H3V11Z M9 21v-7h6v7"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PersonGlyph({ color }: { color: string }) {
  return (
    <Svg
      width={23}
      height={23}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle cx="12" cy="6.5" r="3" fill="none" stroke={color} strokeWidth="1.8" />
      <Path d="M5 21v-5l7-4 7 4v5H5Z" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </Svg>
  );
}

function PrimaryAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryAction, pressed && { opacity: 0.78 }]}
    >
      <Text style={styles.primaryActionText}>{label}</Text>
    </Pressable>
  );
}

function EmptyCards() {
  return (
    <View style={styles.emptyContent}>
      <View style={styles.mockPhone}>
        <View style={styles.mockMain}>
          <View style={styles.mockHeading}>
            <Text style={styles.mockHeadingText}>จดบัตรเครดิต</Text>
            <View style={styles.mockCardIcon}>
              <CreditCardGlyph size={27} />
            </View>
          </View>
          <View style={styles.mockActionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="จดรายการบัตรเครดิต"
              onPress={() => router.push("/entry")}
              style={({ pressed }) => [styles.mockAdd, pressed && { opacity: 0.78 }]}
            >
              <HomeIcon name="edit" size={25} color="#FFFFFF" />
              <Text style={styles.mockAddText}>จดเพิ่ม</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="จดรายการบัตรเครดิต"
              onPress={() => router.push("/entry")}
              style={styles.mockUp}
            >
              <HomeIcon name="chevronUp" size={30} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
            <Svg
              width={44}
              height={38}
              viewBox="0 0 44 38"
              style={styles.mockArrow}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Path
                d="M42 36C37 14 24 9 5 10m0 0 9-8M5 10l9 7"
                fill="none"
                stroke={YELLOW}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </View>
        <View style={styles.mockTabs}>
          <View style={styles.mockTab}>
            <HouseGlyph color={BLUE} />
            <Text style={[styles.mockTabText, { color: BLUE }]}>หน้าแรก</Text>
          </View>
          <View style={styles.mockTab}>
            <PersonGlyph color="#0E1724" />
            <Text style={styles.mockTabText}>พี่มนุษย์</Text>
          </View>
        </View>
      </View>
      <Text selectable style={styles.emptyGuide}>
        เริ่มจดบัตรเครดิต กดปุ่ม “จดเพิ่ม” ในหน้าแรก
      </Text>
    </View>
  );
}

function SavedCards({ cards }: { cards: SavedCard[] }) {
  return (
    <View style={styles.savedContent}>
      <Text style={styles.savedHeading}>บัตรในรายการของฉัน</Text>
      <Text style={styles.savedDescription}>บัตรที่เคยใช้จดรายการจะแสดงที่นี่</Text>
      <View style={styles.cardList}>
        {cards.map((card, index) => (
          <View key={`${card.cardName}-${card.cardLast4 ?? ""}-${index}`} style={styles.cardRow}>
            <View style={styles.savedIcon}>
              <CreditCardGlyph color="#FFFFFF" size={25} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text selectable numberOfLines={2} style={styles.cardName}>
                {card.cardName}
              </Text>
              <Text selectable style={styles.cardNumber}>
                {card.cardLast4 ? `•••• ${card.cardLast4}` : "ไม่ได้ระบุเลขท้ายบัตร"}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <PrimaryAction label="จดรายการบัตรเครดิต" onPress={() => router.push("/entry")} />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: "/import", params: { type: "statement" } })}
        style={styles.importLink}
      >
        <Text style={styles.importLinkText}>นำเข้าใบแจ้งยอด PDF ›</Text>
      </Pressable>
    </View>
  );
}

function CardsContent({ cards }: { cards: SavedCard[] }) {
  return <View style={styles.screen}>{cards.length ? <SavedCards cards={cards} /> : <EmptyCards />}</View>;
}

export default function CardsSettingsScreen() {
  const isFocused = useIsFocused();
  const cardsQuery = useQuery({ ...walletsQueryOptions.cards(), enabled: isFocused });

  return (
    <SettingsPage title="บัตรเครดิตของฉัน">
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {cardsQuery.data === undefined ? (
          cardsQuery.error ? (
            <Pressable
              onPress={() => {
                void cardsQuery.refetch();
              }}
              style={{ padding: 20 }}
            >
              <Text selectable style={settingsPageStyles.error}>
                {cardsQuery.error.message} · ลองอีกครั้ง
              </Text>
            </Pressable>
          ) : (
            <ActivityIndicator color={BLUE} style={{ marginTop: 30 }} />
          )
        ) : (
          <>
            {cardsQuery.error ? (
              <Text selectable style={settingsPageStyles.error}>
                {cardsQuery.error.message}
              </Text>
            ) : null}
            <CardsContent cards={cardsQuery.data} />
          </>
        )}
      </ScrollView>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 540, backgroundColor: NAVY, alignItems: "center" },
  emptyContent: { width: "100%", alignItems: "center", paddingTop: 50, paddingBottom: 38 },
  mockPhone: {
    width: "68%",
    maxWidth: 300,
    minWidth: 255,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: PANEL,
  },
  mockMain: { height: 153, paddingTop: 18, paddingHorizontal: 12, alignItems: "center" },
  mockHeading: { flexDirection: "row", alignItems: "center", gap: 12, marginLeft: 26 },
  mockHeadingText: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  mockCardIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  mockActionRow: { marginTop: 21, flexDirection: "row", alignItems: "center" },
  mockAdd: {
    minHeight: 50,
    borderTopLeftRadius: 26,
    borderBottomLeftRadius: 26,
    backgroundColor: BLUE,
    paddingLeft: 20,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  mockAddText: { color: "#FFFFFF", fontSize: 19, fontWeight: "800" },
  mockUp: {
    minHeight: 50,
    width: 50,
    borderTopRightRadius: 26,
    borderBottomRightRadius: 26,
    borderWidth: 3,
    borderColor: YELLOW,
    backgroundColor: BLUE,
    justifyContent: "center",
    alignItems: "center",
  },
  mockArrow: { marginLeft: 6, marginTop: 17 },
  mockTabs: {
    height: 61,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  mockTab: { alignItems: "center", gap: 1 },
  mockTabText: { color: "#0E1724", fontSize: 12, fontWeight: "800" },
  emptyGuide: {
    color: MUTED,
    fontSize: 16,
    lineHeight: 25,
    textAlign: "center",
    marginTop: 25,
    maxWidth: 310,
  },
  importLink: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    marginTop: 3,
  },
  importLinkText: {
    color: "#51A1FF",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  savedContent: { width: "100%", maxWidth: 560, paddingTop: 12, paddingBottom: 32, gap: 15 },
  savedHeading: { color: "#FFFFFF", fontSize: 19, fontWeight: "800" },
  savedDescription: { color: MUTED, fontSize: 14, lineHeight: 22 },
  cardList: { gap: 10, marginTop: 7 },
  cardRow: {
    minHeight: 80,
    borderRadius: 18,
    backgroundColor: PANEL,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  savedIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  cardName: { color: "#FFFFFF", fontSize: 16, lineHeight: 23, fontWeight: "800" },
  cardNumber: { color: MUTED, fontSize: 13, lineHeight: 19, fontVariant: ["tabular-nums"] },
  primaryAction: {
    minHeight: 50,
    borderRadius: 25,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginTop: 6,
  },
  primaryActionText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
