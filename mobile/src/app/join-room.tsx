import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette } from '@/constants/theme';
import { useSession } from '@/utils/session';
import { joinRoomSchema } from '@/validation/game';

export default function JoinRoomScreen() {
  const { api } = useSession();
  const [roomId, setRoomId] = useState('');
  const [joining, setJoining] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  async function pasteCode() {
    setRoomId((await Clipboard.getStringAsync()).trim());
  }

  async function joinRoom(value?: string) {
    const parsed = joinRoomSchema.safeParse({ roomId: (value ?? roomId).trim() });
    if (!parsed.success) {
      Alert.alert('Invalid room', parsed.error.issues[0]?.message ?? 'Room code is required');
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
  }

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

  return (
    <Screen>
      <SectionCard>
        <Text style={styles.title}>Join room</Text>
        <FormField label="Room code" value={roomId} onChangeText={setRoomId} autoCapitalize="none" />
        <Button label={joining ? 'Joining...' : 'Join'} onPress={() => void joinRoom()} disabled={joining} />
        <Button label="Paste from clipboard" tone="secondary" onPress={() => void pasteCode()} />
        <Button label="Scan QR code" tone="secondary" onPress={() => void openScanner()} />
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
              setRoomId(data.trim());
              void joinRoom(data.trim());
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
});
