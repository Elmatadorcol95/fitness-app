import { useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { VulcanDialog }      from '@/components/ui/VulcanDialog';
import { VulcanBottomSheet, type SheetOption } from '@/components/ui/VulcanBottomSheet';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { useProgressStore, type ProgressPhoto } from '@/store/progress.store';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { hapticsLight } from '@/lib/haptics';

type Pose = 'front' | 'side' | 'back';
const POSES: Pose[] = ['front', 'side', 'back'];

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_SIZE = (SCREEN_WIDTH - Spacing.four * 2 - Spacing.two * 2) / 3;

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

async function savePhotoLocally(tempUri: string, pose: Pose): Promise<string> {
  console.log('[Photo] 1 — URI origen:', tempUri);

  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) throw new Error('FileSystem.documentDirectory es null — módulo nativo no disponible');

  const dir = `${baseDir}progress-photos/`;
  console.log('[Photo] 2 — directorio destino:', dir);

  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  console.log('[Photo] 3 — directorio listo');

  const fileName = `progress_${pose}_${Date.now()}.jpg`;
  const dest = dir + fileName;
  console.log('[Photo] 4 — destino final:', dest);

  await FileSystem.copyAsync({ from: tempUri, to: dest });
  console.log('[Photo] 5 — copia OK');

  return dest;
}

export function PhotosTab() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { photos, addPhoto, deletePhoto } = useProgressStore();

  const [activePose, setActivePose] = useState<Pose>('front');
  const [sliderVisible, setSliderVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProgressPhoto | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  const posePhotos = photos.filter((p) => p.pose === activePose);
  const today = todayStr();
  const hasPhotoToday = posePhotos.some((p) => p.date === today);

  async function handleAddPhoto() {
    if (hasPhotoToday) {
      setLimitOpen(true);
      return;
    }
    setSourceOpen(true);
  }

  async function openPicker(source: 'camera' | 'gallery') {
    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('', 'Se necesita permiso de cámara');
        return;
      }
      result = await ImagePicker.launchCameraAsync({ quality: 0.75, allowsEditing: false });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('', 'Se necesita permiso de galería');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({ quality: 0.75, allowsEditing: false });
    }

    if (result.canceled || !result.assets[0]) return;

    try {
      console.log('[Photo] asset devuelto por ImagePicker:', result.assets[0].uri);
      const permanentUri = await savePhotoLocally(result.assets[0].uri, activePose);
      console.log('[Photo] 6 — guardando en SQLite, uri:', permanentUri);
      await addPhoto(today, activePose, permanentUri);
      await hapticsLight();
      console.log('[Photo] 7 — guardado en DB OK');
    } catch (e) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e);
      console.error('[Photo] ERROR al guardar:', e);
      setSaveErrorMsg(msg);
    }
  }

  function confirmDelete(photo: ProgressPhoto) {
    setDeleteTarget(photo);
  }

  const renderPhoto = ({ item }: { item: ProgressPhoto }) => (
    <TouchableOpacity
      onLongPress={() => confirmDelete(item)}
      style={[styles.photoCell, { backgroundColor: theme.backgroundElement }]}
    >
      <Image
        source={{ uri: item.localUri }}
        style={styles.photoImg}
        contentFit="cover"
      />
      <ThemedText themeColor="textSecondary" style={styles.photoDate}>
        {item.date}
      </ThemedText>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Privacy banner */}
      <View style={[styles.privacyBanner, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="lock-closed" size={14} color="#3FBF7F" />
        <ThemedText themeColor="textSecondary" style={styles.privacyText}>
          {t('tabs.progress.photos.privacyNote')}
        </ThemedText>
      </View>

      {/* Pose selector */}
      <View style={[styles.poseBar, { backgroundColor: theme.backgroundElement }]}>
        {POSES.map((pose) => (
          <TouchableOpacity
            key={pose}
            onPress={() => setActivePose(pose)}
            style={[
              styles.poseBtn,
              activePose === pose && { backgroundColor: theme.accent },
            ]}
          >
            <ThemedText
              style={[
                styles.poseBtnText,
                activePose === pose && { color: theme.textOnAccent },
              ]}
            >
              {t(`tabs.progress.photos.poses.${pose}`)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Photos grid */}
      {posePhotos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="camera-outline" size={48} color={theme.textSecondary} />
          <ThemedText type="defaultSemiBold" style={styles.emptyText}>
            {t('tabs.progress.photos.noPhotos')}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.emptySub}>
            {t('tabs.progress.photos.noPhotosSub')}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={posePhotos}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.row}
          renderItem={renderPhoto}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom actions */}
      <View style={styles.actions}>
        {posePhotos.length >= 2 && (
          <TouchableOpacity
            onPress={() => setSliderVisible(true)}
            style={[styles.actionBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.accent + '60', borderWidth: 1 }]}
          >
            <ThemedText style={{ color: theme.accent, fontWeight: '600' }}>
              {t('tabs.progress.photos.compare')}
            </ThemedText>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleAddPhoto}
          style={[styles.actionBtn, { backgroundColor: theme.accent, flex: 1 }]}
        >
          <ThemedText style={{ color: theme.textOnAccent, fontWeight: '600' }}>
            + {t('tabs.progress.photos.addPhoto')}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Before/After slider */}
      <BeforeAfterSlider
        visible={sliderVisible}
        photos={posePhotos}
        onClose={() => setSliderVisible(false)}
      />

      <VulcanDialog
        visible={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t('tabs.progress.photos.deleteConfirm')}
        message={t('tabs.progress.photos.deleteWarning')}
        confirmLabel={t('tabs.progress.photos.confirmDelete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return;
          try { await FileSystem.deleteAsync(deleteTarget.localUri, { idempotent: true }); } catch {}
          await deletePhoto(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      <VulcanDialog
        visible={limitOpen}
        onClose={() => setLimitOpen(false)}
        title={t('tabs.progress.photos.limitReached')}
        confirmLabel="OK"
        onConfirm={() => setLimitOpen(false)}
        hideCancel
      />

      <VulcanDialog
        visible={saveErrorMsg !== ''}
        onClose={() => setSaveErrorMsg('')}
        title="Error al guardar"
        message={saveErrorMsg}
        confirmLabel="OK"
        onConfirm={() => setSaveErrorMsg('')}
        hideCancel
      />

      <VulcanBottomSheet<'camera' | 'gallery'>
        visible={sourceOpen}
        onClose={() => setSourceOpen(false)}
        onSelect={(src) => { setSourceOpen(false); void openPicker(src); }}
        options={[
          { value: 'camera',  label: t('tabs.progress.photos.camera') } satisfies SheetOption<'camera'>,
          { value: 'gallery', label: t('tabs.progress.photos.gallery') } satisfies SheetOption<'gallery'>,
        ]}
        title={t('tabs.progress.photos.selectSource')}
        cancelLabel={t('common.cancel')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: 10,
    marginBottom: Spacing.two,
  },
  privacyText: { flex: 1, fontSize: 12, lineHeight: 17 },
  poseBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: Spacing.two,
    gap: 4,
  },
  poseBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: 9,
    alignItems: 'center',
  },
  poseBtnText: { fontSize: 14, fontWeight: '500' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  emptyText: { textAlign: 'center' },
  emptySub: { textAlign: 'center', fontSize: 14 },
  grid: { flex: 1 },
  gridContent: { gap: Spacing.one },
  row: { gap: Spacing.one },
  photoCell: {
    width: PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoImg: { width: PHOTO_SIZE, height: PHOTO_SIZE },
  photoDate: { fontSize: 10, padding: 4, textAlign: 'center' },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  actionBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});
