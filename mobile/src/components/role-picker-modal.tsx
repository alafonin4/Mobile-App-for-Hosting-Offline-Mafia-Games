import { Modal, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { SectionCard } from '@/components/section-card';
import { palette } from '@/constants/theme';
import { type RoleCatalogItem } from '@/utils/api';

export function RolePickerModal({
  visible,
  title,
  items,
  counts,
  onChange,
  onClose,
}: {
  visible: boolean;
  title: string;
  items: RoleCatalogItem[];
  counts: Record<string, number>;
  onChange: (item: RoleCatalogItem, nextValue: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Button label="Done" onPress={onClose} tone="secondary" />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {items.map((item) => {
            const count = counts[item.id] ?? 0;
            return (
              <SectionCard key={item.id}>
                <Text style={styles.roleName}>{item.name}</Text>
                <Text style={styles.description}>{item.description}</Text>
                <View style={styles.counterRow}>
                  <Button label="-" onPress={() => onChange(item, count - 1)} tone="secondary" />
                  <Text style={styles.count}>{count}</Text>
                  <Button label="+" onPress={() => onChange(item, count + 1)} tone="secondary" />
                </View>
              </SectionCard>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.sand,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  title: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    gap: 16,
    flexGrow: 1, // ✅ обязательно, чтобы ScrollView занимал всё пространство
  },
  roleName: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  count: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '800',
    minWidth: 32,
    textAlign: 'center',
  },
});