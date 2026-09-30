import { createElement, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { clients, findClient } from '../clients';
import { Field, PrimaryButton, ScreenHeader } from '../components';
import { codeFor, getReport, saveReport, setEngineerName, uniqueCode } from '../db';
import { isIsoDate } from '../dates';
import { linkIssueCount, metricInconsistent, reportIssueCount, slotHasValue, toggleUnit } from '../metrics';
import { mergeSide, parseGraphText } from '../ocr';
import { readGraphText } from '../recognize';
import { createBlankReport } from '../reports';
import { shareReportPdf } from '../share';
import { colors } from '../theme';
import type { Metric, Report, Side } from '../types';

export function EditorScreen({
  reportId,
  engineerName,
  onBack,
  onSaved,
}: {
  reportId?: string;
  engineerName: string;
  onBack: () => void;
  onSaved: (id: string) => void;
}) {
  const [report, setReport] = useState<Report | null>(null);
  const [linkId, setLinkId] = useState(clients[0].links[0].id);
  const [busy, setBusy] = useState(false);
  const [ocrNote, setOcrNote] = useState('');
  const initial = useRef('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const existing = reportId ? await getReport(reportId) : null;
      const next = existing ?? createBlankReport(clients[0], engineerName);
      if (cancelled) return;
      setReport(next);
      const firstLink = findClient(next.clientId).links[0]?.id;
      if (firstLink) setLinkId(firstLink);
      initial.current = JSON.stringify(next);
    }
    void load();
    return () => {
      cancelled = true;
    };
    // engineerName is only the initial value for a new report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  function leave() {
    if (!report || JSON.stringify(report) === initial.current) {
      onBack();
      return;
    }
    Alert.alert('Buang perubahan?', 'Perubahan yang belum disimpan akan hilang.', [
      { text: 'Lanjut mengisi', style: 'cancel' },
      { text: 'Buang', style: 'destructive', onPress: onBack },
    ]);
  }

  function patch(partial: Partial<Report>) {
    setReport((current) => (current ? { ...current, ...partial } : current));
  }

  function updateSide(
    windowId: string,
    direction: 'download' | 'upload',
    field: keyof Side,
    metric: Partial<Metric>,
  ) {
    setReport((current) => {
      if (!current) return current;
      const slots = current.slots[linkId].map((slot) => {
        if (slot.windowId !== windowId) return slot;
        const side = slot[direction];
        return { ...slot, [direction]: { ...side, [field]: { ...side[field], ...metric } } };
      });
      return { ...current, slots: { ...current.slots, [linkId]: slots } };
    });
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? '');
        const base64 = text.slice(text.indexOf(',') + 1);
        if (!base64) reject(new Error('Gambar kosong'));
        else resolve(base64);
      };
      reader.onerror = () => reject(reader.error ?? new Error('Gambar tidak terbaca'));
      reader.readAsDataURL(file);
    });
  }

  async function onWebFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;
    const captures: { base64: string; mime: string }[] = [];
    for (const file of files) {
      captures.push({ base64: await fileToBase64(file), mime: file.type || 'image/jpeg' });
    }
    await readCaptures(captures);
  }

  async function pickPhotos(source: 'camera' | 'library') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin dibutuhkan', 'Aktifkan kamera atau galeri untuk membaca grafik.');
      return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.7, base64: true })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.7,
            base64: true,
            allowsMultipleSelection: true,
          });
    if (result.canceled) return;
    const captures = result.assets
      .filter((asset) => asset.base64)
      .map((asset) => ({ base64: asset.base64 ?? '', mime: asset.mimeType ?? 'image/jpeg' }));
    if (captures.length === 0) {
      Alert.alert('Foto tidak terbaca', 'Coba pilih gambar lain.');
      return;
    }
    await readCaptures(captures);
  }

  async function readCaptures(captures: { base64: string; mime: string }[]) {
    const client = findClient(report?.clientId ?? clients[0].id);
    const notes: string[] = [];
    let shownLink = '';
    for (let index = 0; index < captures.length; index += 1) {
      const capture = captures[index];
      setOcrNote(`Membaca ${index + 1} dari ${captures.length} capture...`);
      let reading = parseGraphText('', client);
      try {
        const text = await readGraphText(`data:${capture.mime};base64,${capture.base64}`, setOcrNote);
        reading = parseGraphText(text, client);
      } catch (error) {
        console.error(error);
        reading = { ...reading, note: 'Pembacaan gambar gagal.' };
      }
      notes.push(reading.note);
      if (reading.linkId && reading.windowId) {
        shownLink = reading.linkId;
        setReport((current) => {
          if (!current) return current;
          const slots = (current.slots[reading.linkId ?? ''] ?? []).map((slot) =>
            slot.windowId === reading.windowId
              ? {
                  ...slot,
                  download: mergeSide(slot.download, reading.download),
                  upload: mergeSide(slot.upload, reading.upload),
                }
              : slot,
          );
          return {
            ...current,
            date: reading.date ?? current.date,
            slots: { ...current.slots, [reading.linkId ?? '']: slots },
          };
        });
      } else if (reading.date) {
        setReport((current) => (current ? { ...current, date: reading.date ?? current.date } : current));
      }
    }
    if (shownLink) setLinkId(shownLink);
    setOcrNote(notes.join('\n'));
  }

  function openCaptures() {
    if (Platform.OS === 'web') {
      fileRef.current?.click();
      return;
    }
    Alert.alert('Capture MRTG', 'Pilih satu atau beberapa gambar. Jam, hari, dan tanggal dibaca dari gambar.', [
      { text: 'Kamera', onPress: () => void pickPhotos('camera') },
      { text: 'Galeri', onPress: () => void pickPhotos('library') },
      { text: 'Batal', style: 'cancel' },
    ]);
  }

  async function persist(status: Report['status']): Promise<Report | null> {
    if (!report) return null;
    if (!report.engineerName.trim() || !isIsoDate(report.date)) {
      Alert.alert('Data belum lengkap', 'Isi nama engineer dan tanggal dengan format YYYY-MM-DD.');
      return null;
    }
    if (!/^\d{2}:\d{2}$/.test(report.shiftStart) || !/^\d{2}:\d{2}$/.test(report.shiftEnd)) {
      Alert.alert('Jam tidak valid', 'Jam kerja memakai format JJ:MM, misalnya 08:00.');
      return null;
    }
    const next: Report = {
      ...report,
      engineerName: report.engineerName.trim(),
      code: await uniqueCode(codeFor(report.clientId, report.date), report.id),
      status,
      updatedAt: new Date().toISOString(),
    };
    await saveReport(next);
    await setEngineerName(next.engineerName);
    initial.current = JSON.stringify(next);
    setReport(next);
    return next;
  }

  async function lock() {
    if (!report) return;
    const issues = reportIssueCount(report);
    const run = async () => {
      setBusy(true);
      try {
        const saved = await persist('saved');
        if (!saved) return;
        if (saved.shareToWa) {
          try {
            await shareReportPdf(saved);
            const shared: Report = { ...saved, status: 'shared', shareToWa: true };
            await saveReport(shared);
            onSaved(shared.id);
          } catch {
            Alert.alert('Laporan tersimpan', 'PDF belum terkirim. Bagikan lagi dari halaman laporan.');
            onSaved(saved.id);
          }
        } else {
          onSaved(saved.id);
        }
      } finally {
        setBusy(false);
      }
    };
    if (issues > 0) {
      Alert.alert(
        'Ada angka yang perlu dicek',
        `${issues} rata-rata lebih besar dari maksimum. Angka itu tetap bisa dikunci dan akan tampil kuning di PDF.`,
        [
          { text: 'Periksa lagi', style: 'cancel' },
          { text: 'Tetap kunci', onPress: () => void run() },
        ],
      );
      return;
    }
    await run();
  }

  if (!report) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Laporan" onBack={onBack} />
        <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const client = findClient(report.clientId);

  return (
    <View style={styles.screen}>
      {Platform.OS === 'web'
        ? createElement('input', {
            ref: fileRef,
            type: 'file',
            accept: 'image/*',
            multiple: true,
            style: { display: 'none' },
            onChange: (event: Event) => void onWebFile(event),
          })
        : null}
      <ScreenHeader title={reportId ? 'Ubah laporan' : 'Laporan baru'} subtitle={client.name} onBack={leave} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Field label="Nama engineer" value={report.engineerName} onChangeText={(engineerName) => patch({ engineerName })} />
        <Field label="Tanggal" value={report.date} onChangeText={(date) => patch({ date })} placeholder="YYYY-MM-DD" keyboard="numbers-and-punctuation" />
        <View style={styles.pair}>
          <View style={{ flex: 1 }}>
            <Field label="Jam mulai" value={report.shiftStart} onChangeText={(shiftStart) => patch({ shiftStart })} />
          </View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <Field label="Jam selesai" value={report.shiftEnd} onChangeText={(shiftEnd) => patch({ shiftEnd })} />
          </View>
        </View>
        <Field label="Lokasi" value={report.location} onChangeText={(location) => patch({ location })} />

        <Text style={styles.section}>Kegiatan</Text>
        {report.activities.map((activity) => (
          <View key={activity.id} style={styles.card}>
            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <Field label="Mulai" value={activity.start} onChangeText={(start) => updateActivity(activity.id, { start })} />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Field label="Selesai" value={activity.end} onChangeText={(end) => updateActivity(activity.id, { end })} />
              </View>
            </View>
            <Field label="Kegiatan" value={activity.title} onChangeText={(title) => updateActivity(activity.id, { title })} />
            <Field label="Keterangan" value={activity.note} onChangeText={(note) => updateActivity(activity.id, { note })} />
            <Pressable onPress={() => removeActivity(activity.id)}>
              <Text style={styles.remove}>Hapus kegiatan</Text>
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={() =>
            patch({
              activities: [...report.activities, { id: `${Date.now()}`, start: '', end: '', title: '', note: '' }],
            })
          }
        >
          <Text style={styles.add}>Tambah kegiatan</Text>
        </Pressable>

        <Text style={styles.section}>Traffic</Text>
        <Pressable onPress={openCaptures} style={styles.photoButton}>
          <Text style={styles.photoButtonText}>Upload capture MRTG</Text>
        </Pressable>
        <Text style={styles.note}>Bisa beberapa file sekaligus. Jam, hari, dan tanggal dibaca dari gambar, lalu slot waktunya terisi sendiri.</Text>
        {ocrNote ? <Text style={styles.ocrNote}>{ocrNote}</Text> : null}
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {client.links.map((link) => {
            const issues = linkIssueCount(report, link.id);
            const graphs = (report.slots[link.id] ?? []).filter(slotHasValue).length;
            const selected = link.id === linkId;
            return (
              <Pressable key={link.id} onPress={() => setLinkId(link.id)} style={[styles.chip, selected && styles.chipOn]}>
                <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                  {link.name.replace('Gedung ', '')} {link.role === 'Mainlink' ? 'main' : 'backup'}
                </Text>
                <Text style={[styles.chipCount, selected && styles.chipTextOn]}>
                  {graphs}/{client.windows.length}
                </Text>
                {issues > 0 ? <Text style={styles.chipWarn}>{issues}</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {(report.slots[linkId] ?? []).map((slot) => {
          const label = client.windows.find((item) => item.id === slot.windowId)?.label ?? slot.windowId;
          return (
            <View key={slot.windowId} style={styles.card}>
              <Text style={styles.window}>{label}</Text>
              <MetricBlock
                title="Download"
                side={slot.download}
                onChange={(field, metric) => updateSide(slot.windowId, 'download', field, metric)}
              />
              <MetricBlock
                title="Upload"
                side={slot.upload}
                onChange={(field, metric) => updateSide(slot.windowId, 'upload', field, metric)}
              />
            </View>
          );
        })}

        <Text style={styles.section}>Catatan</Text>
        <TextInput
          value={report.notes}
          onChangeText={(notes) => patch({ notes })}
          placeholder="Kondisi link, gangguan, atau hal yang perlu NOC ketahui."
          placeholderTextColor="#9AA7B4"
          multiline
          style={styles.notes}
        />

        <View style={styles.shareRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.window}>Kirim ke grup WA</Text>
            <Text style={styles.note}>Setelah dikunci, lembar bagikan terbuka. Pilih grup WhatsApp di sana. Jika dimatikan, laporan hanya tersimpan di aplikasi.</Text>
          </View>
          <Switch
            value={report.shareToWa}
            onValueChange={(shareToWa) => patch({ shareToWa })}
            trackColor={{ true: colors.teal, false: colors.line }}
          />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          label="Simpan draf"
          secondary
          disabled={busy}
          onPress={() => {
            setBusy(true);
            void persist('draft')
              .then((saved) => {
                if (saved) onSaved(saved.id);
              })
              .finally(() => setBusy(false));
          }}
        />
        <View style={{ width: 8 }} />
        <PrimaryButton label={busy ? 'Menyimpan…' : 'Kunci laporan'} disabled={busy} onPress={() => void lock()} />
      </View>
    </View>
  );

  function updateActivity(id: string, partial: Partial<Report['activities'][number]>) {
    setReport((current) => {
      if (!current) return current;
      return {
        ...current,
        activities: current.activities.map((activity) => (activity.id === id ? { ...activity, ...partial } : activity)),
      };
    });
  }

  function removeActivity(id: string) {
    setReport((current) => {
      if (!current) return current;
      return { ...current, activities: current.activities.filter((activity) => activity.id !== id) };
    });
  }
}

function MetricBlock({
  title,
  side,
  onChange,
}: {
  title: string;
  side: Side;
  onChange: (field: keyof Side, metric: Partial<Metric>) => void;
}) {
  const bad = metricInconsistent(side.avg, side.max);
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={styles.note}>{title}</Text>
      <View style={styles.metrics}>
        <MetricInput label="Saat ini" metric={side.current} onChange={(metric) => onChange('current', metric)} />
        <MetricInput label="Rata-rata" metric={side.avg} bad={bad} onChange={(metric) => onChange('avg', metric)} />
        <MetricInput label="Maks" metric={side.max} onChange={(metric) => onChange('max', metric)} />
      </View>
    </View>
  );
}

function MetricInput({
  label,
  metric,
  bad,
  onChange,
}: {
  label: string;
  metric: Metric;
  bad?: boolean;
  onChange: (metric: Partial<Metric>) => void;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <TextInput
        value={metric.value}
        onChangeText={(value) => onChange({ value })}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor="#9AA7B4"
        style={[styles.metricInput, bad && styles.metricBad]}
      />
      <Pressable onPress={() => onChange({ unit: toggleUnit(metric.unit) })}>
        <Text style={styles.unit}>{metric.unit}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  body: { padding: 16, paddingBottom: 28 },
  pair: { flexDirection: 'row', alignItems: 'center' },
  section: { color: colors.teal, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, marginTop: 6 },
  ocrNote: { color: colors.ink, marginBottom: 10, lineHeight: 20 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 10 },
  window: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  note: { color: colors.muted, marginTop: 2, lineHeight: 18 },
  remove: { color: colors.danger, fontWeight: '700' },
  add: { color: colors.teal, fontWeight: '700', marginBottom: 16 },
  chips: { gap: 8, paddingBottom: 10 },
  chip: { borderRadius: 20, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', gap: 6 },
  chipOn: { backgroundColor: colors.navy },
  chipText: { color: colors.ink, fontWeight: '600' },
  chipTextOn: { color: colors.white },
  chipCount: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  chipWarn: { color: colors.amber, fontWeight: '700' },
  metrics: { flexDirection: 'row', gap: 8, marginTop: 6 },
  metric: { flex: 1 },
  metricLabel: { color: colors.muted, fontSize: 11, marginBottom: 4 },
  metricInput: {
    backgroundColor: colors.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 8,
    paddingVertical: 8,
    color: colors.ink,
    fontSize: 15,
  },
  metricBad: { borderColor: colors.amber, backgroundColor: colors.amberBg },
  unit: { color: colors.teal, fontWeight: '700', fontSize: 12, marginTop: 4 },
  photoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  photoButton: { backgroundColor: colors.tealSoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  photoButtonText: { color: colors.teal, fontWeight: '700' },
  notes: {
    minHeight: 90,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    color: colors.ink,
    fontSize: 15,
  },
  shareRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 16 },
  footer: { flexDirection: 'row', padding: 16, paddingTop: 8 },
});
