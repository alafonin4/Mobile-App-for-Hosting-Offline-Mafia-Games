import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette } from '@/constants/theme';
import { extractRoomIdFromInvite } from '@/utils/room-invite';
import { useSession } from '@/utils/session';
import { joinRoomSchema } from '@/validation/game';

export default function JoinRoomScreen() {
  const params = useLocalSearchParams<{ roomId?: string }>();
  const { api, session } = useSession();
  const [roomId, setRoomId] = useState('');
  const [joining, setJoining] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const autoJoinedRoomIdRef = useRef<string | null>(null);

  const resolveRoomId = useCallback((value: string) => {
    return extractRoomIdFromInvite(value) ?? value.trim();
  }, []);

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
      Alert.alert('Invalid invite', 'Clipboard does not contain a valid room QR/link.');
    }
  }

  const joinRoom = useCallback(async (value?: string) => {
    const resolvedRoomId = resolveRoomId(value ?? roomId);
    const parsed = joinRoomSchema.safeParse({ roomId: resolvedRoomId });
    if (!parsed.success) {
      Alert.alert('Invalid room', parsed.error.issues[0]?.message ?? 'Room code is required');
      return;
    }

    if (!session.refreshToken) {
      Alert.alert('Login required', 'Sign in to join the room from this invite.');
      return;
    }

    try {
      setJoining(true);
      const room = await api.joinRoom(parsed.data.roomId);
      router.replace(`/lobby/${room.roomId}`);
    } catch (error) {
      Alert.alert('Join failed', error instanceof Error ? error.message : 'Cannot join room');
    } finally {
      setJoining(false);
    }
  }, [api, resolveRoomId, roomId, session.refreshToken]);

  async function openScanner() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera denied', 'Allow camera access to scan room QR codes.');
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
    <Screen>
      <SectionCard>
        <Text style={styles.title}>Join room</Text>
        <FormField label="Room code" value={roomId} onChangeText={setRoomId} autoCapitalize="none" />
        <Button label={joining ? 'Joining...' : 'Join'} onPress={() => void joinRoom()} disabled={joining} />
        <Button label="Paste from clipboard" tone="secondary" onPress={() => void pasteCode()} />
        <Button label="Scan QR code" tone="secondary" onPress={() => void openScanner()} />
        {!session.refreshToken ? (
          <>
            <Text style={styles.caption}>Login is required to join a room from a QR invite.</Text>
            <Button
              label="Open login"
              tone="secondary"
              onPress={() =>
                router.push({
                  pathname: '/login',
                  params: roomId ? { roomId } : undefined,
                })
              }
            />
            <Button
              label="Open registration"
              tone="secondary"
              onPress={() =>
                router.push({
                  pathname: '/register',
                  params: roomId ? { roomId } : undefined,
                })
              }
            />
          </>
        ) : null}
      </SectionCard>

      <Modal visible={scannerVisible} animationType="slide">
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.title}>Scan QR</Text>
            <Button label="Close" tone="secondary" onPress={() => setScannerVisible(false)} />
          </View>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              setScannerVisible(false);
              const resolvedRoomId = fillRoomId(data);
              if (!resolvedRoomId) {
                Alert.alert('Invalid QR', 'This QR code does not contain a valid room invite.');
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

const styles = StyleSheet.create({
  title: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '700',
  },
  modalSafeArea: {
    backgroundColor: palette.sand,
    flex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  camera: {
    flex: 1,
    margin: 16,
  },
  caption: {
    color: palette.muted,
    fontSize: 13,
    textAlign: 'center',
  },
});
