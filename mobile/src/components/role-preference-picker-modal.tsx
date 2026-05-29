import { Modal, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { SectionCard } from '@/components/section-card';
import { palette } from '@/constants/theme';
import { type RoleCatalogItem } from '@/utils/api';
import { useLocalization } from '@/utils/localization';

type RolePreferencePickerModalProps = {
  visible: boolean;
  title: string;
  items: RoleCatalogItem[];
  selectedIds: string[];
  selectionLimit: number;
  onToggle: (item: RoleCatalogItem) => void;
  onClose: () => void;
};

export function RolePreferencePickerModal({
  visible,
  title,
  items,
  selectedIds,
  selectionLimit,
  onToggle,
  onClose,
}: RolePreferencePickerModalProps) {
  const { t } = useLocalization();
  const selectedSet = new Set(selectedIds);

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{t('modal.chooseUpTo').replace('{count}', String(selectionLimit))}</Text>
          </View>
          <Button label={t('common.done')} onPress={onClose} tone="secondary" />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {items.map((item) => {
            const selected = selectedSet.has(item.id);
            const selectionLimitReached = !selected && selectedIds.length >= selectionLimit;
            return (
              <SectionCard key={item.id}>
                <Text style={styles.roleName}>{item.name}</Text>
                <Text style={styles.description}>{item.description}</Text>
                <Text style={styles.meta}>{t('modal.faction')}: {item.faction}</Text>
                <Button
                  label={selected ? t('common.selectedPrefix') : t('common.select')}
                  onPress={() => onToggle(item)}
                  tone={selected ? 'primary' : 'secondary'}
                  disabled={selectionLimitReached}
                />
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
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 13,
  },
  content: {
    padding: 16,
    gap: 16,
    flexGrow: 1,
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
  meta: {
    color: palette.blue,
    fontSize: 12,
    fontWeight: '600',
  },
});
