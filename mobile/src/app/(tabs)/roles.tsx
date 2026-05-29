import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';

import { RoleShowcaseCard } from '@/components/role-showcase-card';
import { useAppTheme, useThemedStyles } from '@/theme';
import { mergeRoleCatalog } from '@/utils/role-gallery';
import { type RoleCatalogItem } from '@/utils/api';
import { useLocalization } from '@/utils/localization';
import { useSession } from '@/utils/session';

export default function RolesScreen() {
  const { api } = useSession();
  const { colors } = useAppTheme();
  const { t } = useLocalization();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [roles, setRoles] = useState<RoleCatalogItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const styles = useThemedStyles((theme) => ({
    root: {
      backgroundColor: theme.background,
      flex: 1,
    },
    loader: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    helperBand: {
      gap: 4,
      paddingHorizontal: 18,
      paddingTop: 14,
    },
    eyebrow: {
      color: theme.accent,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.text,
      fontSize: 20,
      fontWeight: '800',
    },
    caption: {
      color: theme.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    pager: {
      flex: 1,
    },
    page: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    card: {
      flex: 1,
    },
    footer: {
      alignItems: 'center',
      paddingBottom: 12,
      paddingHorizontal: 18,
      paddingTop: 6,
    },
    footerText: {
      color: theme.textMuted,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.4,
      textAlign: 'center',
    },
  }));

  useEffect(() => {
    async function loadRoles() {
      try {
        const [mafiaRoles, townRoles] = await Promise.all([api.getMafiaRoles(), api.getTownRoles()]);
        setRoles(mergeRoleCatalog(mafiaRoles, townRoles));
      } finally {
        setLoading(false);
      }
    }

    void loadRoles();
  }, [api]);

  const loopedRoles = useMemo(() => (
    roles.length ? [...roles, ...roles, ...roles] : []
  ), [roles]);

  useEffect(() => {
    if (!roles.length || width <= 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: width * roles.length, animated: false });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [roles, width]);

  function handleMomentumScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!roles.length || width <= 0) {
      return;
    }

    const rawPage = Math.round(event.nativeEvent.contentOffset.x / width);
    const roleIndex = ((rawPage % roles.length) + roles.length) % roles.length;
    setActiveIndex(roleIndex);

    if (rawPage < roles.length || rawPage >= roles.length * 2) {
      scrollRef.current?.scrollTo({ x: width * (roles.length + roleIndex), animated: false });
    }
  }

  const activeRole = roles[activeIndex] ?? null;

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (!roles.length) {
    return (
      <View style={styles.root}>
        <View style={styles.loader}>
          <Text style={styles.caption}>{t('roles.unavailable')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.helperBand}>
        <Text style={styles.eyebrow}>{t('roles.eyebrow')}</Text>
        <Text style={styles.title}>{activeRole?.name ?? t('roles.gallery')}</Text>
        <Text style={styles.caption}>{t('roles.caption')}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={styles.pager}
      >
        {loopedRoles.map((item, index) => (
          <View key={`${item.id}-${index}`} style={[styles.page, { width }]}>
            <RoleShowcaseCard item={item} style={styles.card} />
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {activeIndex + 1} / {roles.length}
        </Text>
      </View>
    </View>
  );
}
