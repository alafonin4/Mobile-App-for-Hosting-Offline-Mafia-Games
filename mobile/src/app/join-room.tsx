import * as Clipboard from 'expo-clipboard';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, SafeAreaView, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { useThemedStyles } from '@/theme';
import { useLocalization } from '@/utils/localization';
import { extractRoomIdFromInvite } from '@/utils/room-invite';
import { useSession } from '@/utils/session';
import { joinRoomSchema } from '@/validation/game';

export default function JoinRoomScreen() {
  const params = useLocalSearchParams<{ roomId?: string }>();
  const { api, session } = useSession();
  const { t } = useLocalization();
  const styles = useThemedStyles((colors) => ({
    hero: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.accent,
      borderWidth: 1,
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '800',
    },
    eyebrow: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    copy: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
    },
    modalSafeArea: {
      backgroundColor: colors.background,
      flex: 1,
    },
    modalHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 18,
    },
    camera: {
      flex: 1,
      margin: 18,
      overflow: 'hidden',
      borderRadius: 24,
    },
    caption: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
    },
  }));
  const [roomId, setRoomId] = useState('');
  const [joining, setJoining] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const autoJoinedRoomIdRef = useRef<string | null>(null);

  const resolveRoomId = useCallback((value: string) => extractRoomIdFromInvite(value) ?? value.trim(), []);

  const fillRoomId = useCallback((value: string) => {
    const resolvedRoomId = extractRoomIdFromInvite(value);
    if (!resolvedRoomId) {
      return null;
    }

    setRoomId(resolvedRoomId);
    return resolvedRoomId;
  }, []);

  async function pasteCode() {
    const pastedValue = await Clipboard.getStringAsync();
    const resolvedRoomId = fillRoomId(pastedValue);

    if (!resolvedRoomId) {
      Alert.alert(t('join.invalidInvite'), t('join.invalidInviteCopy'));
    }
  }

  const joinRoom = useCallback(
    async (value?: string) => {
      const resolvedRoomId = resolveRoomId(value ?? roomId);
      const parsed = joinRoomSchema.safeParse({ roomId: resolvedRoomId });
      if (!parsed.success) {
        Alert.alert(t('common.invalidRoom'), t('join.roomCodeRequired'));
        return;
      }

      if (!session.refreshToken) {
        Alert.alert(t('join.loginRequired'), t('join.loginRequiredCopy'));
        return;
      }

      try {
        setJoining(true);
        const room = await api.joinRoom(parsed.data.roomId);
        router.replace(`/lobby/${room.roomId}` as never);
      } catch (error) {
        Alert.alert(t('common.joinFailed'), error instanceof Error ? error.message : t('join.cannotJoin'));
      } finally {
        setJoining(false);
      }
    },
    [api, resolveRoomId, roomId, session.refreshToken, t]
  );

  async function openScanner() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(t('join.cameraDenied'), t('join.cameraDeniedCopy'));
        return;
      }
    }
    setScannerVisible(true);
  }

  useEffect(() => {
    if (!params.roomId) {
      return;
    }

    const rawRoomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
    const resolvedRoomId = fillRoomId(rawRoomId);
    if (!resolvedRoomId || !session.refreshToken || autoJoinedRoomIdRef.current === resolvedRoomId) {
      return;
    }

    autoJoinedRoomIdRef.current = resolvedRoomId;
    void joinRoom(resolvedRoomId);
  }, [fillRoomId, joinRoom, params.roomId, session.refreshToken]);

  return (
    <Screen scroll>
      <SectionCard style={styles.hero}>
        <Text style={styles.eyebrow}>{t('join.eyebrow')}</Text>
        <Text style={styles.title}>{t('join.title')}</Text>
        <Text style={styles.copy}>
          {t('join.copy')}
        </Text>
      </SectionCard>

      <SectionCard>
        <FormField label={t('join.roomCode')} value={roomId} onChangeText={setRoomId} autoCapitalize="none" />
        <Button label={joining ? t('join.joining') : t('games.joinRoom')} onPress={() => void joinRoom()} disabled={joining} />
        <Button label={t('join.pasteInvite')} tone="secondary" onPress={() => void pasteCode()} />
        <Button label={t('join.scanQr')} tone="secondary" onPress={() => void openScanner()} />
        {!session.refreshToken ? (
          <>
            <Text style={styles.caption}>{t('join.membershipRequired')}</Text>
            <Button
              label={t('join.openLogin')}
              tone="secondary"
              onPress={() => router.push({ pathname: '/login', params: roomId ? { roomId } : undefined })}
            />
            <Button
              label={t('join.openRegistration')}
              tone="secondary"
              onPress={() => router.push({ pathname: '/register', params: roomId ? { roomId } : undefined })}
            />
          </>
        ) : null}
      </SectionCard>

      <Modal visible={scannerVisible} animationType="slide">
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.title}>{t('join.scanInvitation')}</Text>
            <Button label={t('common.close')} tone="secondary" onPress={() => setScannerVisible(false)} />
          </View>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              setScannerVisible(false);
              const resolvedRoomId = fillRoomId(data);
              if (!resolvedRoomId) {
                Alert.alert(t('join.invalidQr'), t('join.invalidQrCopy'));
                return;
              }
              void joinRoom(resolvedRoomId);
            }}
          />
        </SafeAreaView>
      </Modal>
    </Screen>
  );
}
