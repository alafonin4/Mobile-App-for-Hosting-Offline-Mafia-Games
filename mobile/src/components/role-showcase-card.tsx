import { Text, View, type ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { useThemedStyles } from '@/theme';
import { roleArtworkSpec, roleFactionLabel } from '@/utils/role-gallery';
import { type RoleCatalogItem } from '@/utils/api';
import { useLocalization } from '@/utils/localization';

export function RoleShowcaseCard({
  item,
  style,
}: {
  item: RoleCatalogItem;
  style?: ViewStyle;
}) {
  const artwork = roleArtworkSpec(item);
  const { t } = useLocalization();
  const styles = useThemedStyles((theme) => ({
    card: {
      backgroundColor: theme.surfaceRaised,
      borderColor: theme.border,
      borderRadius: 30,
      borderWidth: 1,
      flex: 1,
      overflow: 'hidden',
      shadowColor: theme.overlay,
      shadowOffset: { width: 0, height: 22 },
      shadowOpacity: 0.22,
      shadowRadius: 28,
      elevation: 12,
    },
    artPanel: {
      backgroundColor: artwork.top,
      minHeight: 360,
      overflow: 'hidden',
      padding: 18,
    },
    artMeta: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'space-between',
      zIndex: 1,
    },
    chip: {
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderColor: 'rgba(255,255,255,0.22)',
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    chipText: {
      color: '#fffaf5',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    artFrame: {
      flex: 1,
      justifyContent: 'center',
      marginTop: 8,
    },
    footer: {
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 22,
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
      fontSize: 28,
      fontWeight: '800',
    },
    description: {
      color: theme.textMuted,
      fontSize: 15,
      lineHeight: 22,
    },
  }));

  return (
    <View style={[styles.card, style]}>
      <View style={styles.artPanel}>
        <View style={styles.artMeta}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{roleFactionLabel(item.faction, t)}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{t('roles.gallery')}</Text>
          </View>
        </View>

        <View style={styles.artFrame}>
          <RoleArtwork item={item} />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.eyebrow}>{item.role.replaceAll('_', ' ')}</Text>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );
}

function RoleArtwork({ item }: { item: RoleCatalogItem }) {
  const artwork = roleArtworkSpec(item);

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`bg-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={artwork.top} />
          <Stop offset="100%" stopColor={artwork.bottom} />
        </LinearGradient>
        <RadialGradient id={`glow-${item.id}`} cx="50%" cy="38%" r="54%">
          <Stop offset="0%" stopColor={artwork.glow} stopOpacity="0.9" />
          <Stop offset="60%" stopColor={artwork.glow} stopOpacity="0.18" />
          <Stop offset="100%" stopColor={artwork.glow} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Rect x="0" y="0" width="100" height="100" rx="8" fill={`url(#bg-${item.id})`} />
      <Circle cx="58" cy="36" r="30" fill={`url(#glow-${item.id})`} />
      <Ellipse cx="52" cy="82" rx="34" ry="10" fill={artwork.mist} />
      <Path d="M0 68 C24 58, 38 62, 52 54 S80 50, 100 40 L100 100 L0 100 Z" fill={artwork.mist} />
      <Line x1="18" y1="24" x2="84" y2="24" stroke={artwork.line} strokeOpacity="0.16" strokeWidth="0.7" />
      <Line x1="12" y1="74" x2="88" y2="74" stroke={artwork.line} strokeOpacity="0.12" strokeWidth="0.7" />

      <G opacity="0.8">
        <Circle cx="18" cy="18" r="1.4" fill={artwork.highlight} />
        <Circle cx="82" cy="16" r="1" fill={artwork.highlight} />
        <Circle cx="77" cy="28" r="1.2" fill={artwork.highlight} />
        <Circle cx="24" cy="66" r="1.2" fill={artwork.highlight} />
      </G>

      <G>
        <Circle cx="50" cy="44" r="18" fill="rgba(255,255,255,0.08)" />
        <Circle cx="50" cy="44" r="15" fill="rgba(255,255,255,0.05)" />
      </G>

      <RoleSymbol symbol={artwork.symbol} color={artwork.line} accent={artwork.highlight} />
    </Svg>
  );
}

function RoleSymbol({
  symbol,
  color,
  accent,
}: {
  symbol: string;
  color: string;
  accent: string;
}) {
  switch (symbol) {
    case 'crown':
      return (
        <G>
          <Polygon points="34,55 40,33 50,46 60,31 66,55" fill="none" stroke={color} strokeWidth="2.6" />
          <Line x1="34" y1="55" x2="66" y2="55" stroke={accent} strokeWidth="3" />
          <Circle cx="40" cy="33" r="2" fill={accent} />
          <Circle cx="50" cy="46" r="2" fill={accent} />
          <Circle cx="60" cy="31" r="2" fill={accent} />
        </G>
      );
    case 'shuriken':
      return (
        <G>
          <Polygon points="50,28 56,42 72,44 58,50 56,66 50,54 34,56 46,48 44,32" fill="none" stroke={color} strokeWidth="2.4" />
          <Circle cx="50" cy="47" r="3.2" fill={accent} />
        </G>
      );
    case 'eye':
      return (
        <G>
          <Path d="M26 46 Q38 30 50 30 Q62 30 74 46 Q62 62 50 62 Q38 62 26 46 Z" fill="none" stroke={color} strokeWidth="2.6" />
          <Circle cx="50" cy="46" r="6" fill="none" stroke={accent} strokeWidth="2.4" />
          <Circle cx="50" cy="46" r="2.6" fill={accent} />
        </G>
      );
    case 'blade':
      return (
        <G>
          <Path d="M38 30 C52 32, 63 43, 67 58 C59 56, 49 55, 39 59 C39 49, 37 39, 38 30 Z" fill="none" stroke={color} strokeWidth="2.8" />
          <Rect x="32" y="58" width="20" height="5" rx="2.5" fill={accent} transform="rotate(-32 42 60.5)" />
        </G>
      );
    case 'lantern':
      return (
        <G>
          <Line x1="50" y1="25" x2="50" y2="32" stroke={accent} strokeWidth="2.4" />
          <Path d="M38 34 H62 L58 60 Q50 70 42 60 Z" fill="none" stroke={color} strokeWidth="2.8" />
          <Path d="M44 42 H56" stroke={accent} strokeWidth="2.4" />
          <Circle cx="50" cy="48" r="5" fill={accent} opacity="0.66" />
        </G>
      );
    case 'shield':
      return (
        <G>
          <Path d="M50 28 L66 34 L63 54 Q60 67 50 74 Q40 67 37 54 L34 34 Z" fill="none" stroke={color} strokeWidth="2.8" />
          <Path d="M50 36 V63" stroke={accent} strokeWidth="2.4" />
          <Path d="M40 49 H60" stroke={accent} strokeWidth="2.4" />
        </G>
      );
    case 'badge':
      return (
        <G>
          <Polygon points="50,26 56,38 70,40 60,50 62,64 50,58 38,64 40,50 30,40 44,38" fill="none" stroke={color} strokeWidth="2.6" />
          <Circle cx="50" cy="46" r="6" fill="none" stroke={accent} strokeWidth="2.3" />
        </G>
      );
    case 'star':
      return (
        <G>
          <Polygon points="50,27 56,40 71,41 60,50 63,64 50,56 37,64 40,50 29,41 44,40" fill="none" stroke={color} strokeWidth="2.8" />
          <Circle cx="50" cy="47" r="2.2" fill={accent} />
        </G>
      );
    case 'newspaper':
      return (
        <G>
          <Rect x="35" y="30" width="30" height="36" rx="3" fill="none" stroke={color} strokeWidth="2.6" />
          <Line x1="41" y1="38" x2="59" y2="38" stroke={accent} strokeWidth="2.2" />
          <Line x1="41" y1="45" x2="59" y2="45" stroke={accent} strokeWidth="2.2" />
          <Line x1="41" y1="52" x2="56" y2="52" stroke={accent} strokeWidth="2.2" />
          <Rect x="41" y="57" width="12" height="5" rx="2" fill={accent} opacity="0.75" />
        </G>
      );
    case 'tracks':
      return (
        <G>
          <Ellipse cx="44" cy="38" rx="5" ry="8" fill="none" stroke={color} strokeWidth="2.4" />
          <Ellipse cx="57" cy="53" rx="5" ry="8" fill="none" stroke={color} strokeWidth="2.4" />
          <Circle cx="38" cy="31" r="2" fill={accent} />
          <Circle cx="48" cy="29" r="2" fill={accent} />
          <Circle cx="52" cy="45" r="2" fill={accent} />
          <Circle cx="62" cy="43" r="2" fill={accent} />
        </G>
      );
    case 'mask':
      return (
        <G>
          <Path d="M30 42 Q40 28 50 28 Q60 28 70 42 Q63 58 50 58 Q37 58 30 42 Z" fill="none" stroke={color} strokeWidth="2.6" />
          <Ellipse cx="42" cy="42" rx="4" ry="3" fill={accent} opacity="0.8" />
          <Ellipse cx="58" cy="42" rx="4" ry="3" fill={accent} opacity="0.8" />
        </G>
      );
    case 'veil':
      return (
        <G>
          <Path d="M38 34 Q50 25 62 34 Q67 44 62 60 Q50 68 38 60 Q33 44 38 34 Z" fill="none" stroke={color} strokeWidth="2.6" />
          <Line x1="41" y1="50" x2="59" y2="50" stroke={accent} strokeWidth="2.4" />
          <Line x1="45" y1="58" x2="55" y2="58" stroke={accent} strokeWidth="2.4" />
        </G>
      );
    case 'beak':
      return (
        <G>
          <Circle cx="45" cy="42" r="10" fill="none" stroke={color} strokeWidth="2.6" />
          <Path d="M50 44 Q64 38 72 46 Q64 55 50 52" fill="none" stroke={accent} strokeWidth="2.6" />
          <Circle cx="42" cy="40" r="2" fill={accent} />
        </G>
      );
    case 'crescent-blade':
      return (
        <G>
          <Path d="M61 28 C49 31 42 41 42 52 C42 61 47 69 55 73 C44 74 32 67 28 55 C23 42 31 29 44 25 C50 23 56 24 61 28 Z" fill="none" stroke={color} strokeWidth="2.6" />
          <Path d="M54 36 L64 46 L58 50 L48 40 Z" fill={accent} />
        </G>
      );
    default:
      return null;
  }
}
