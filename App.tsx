import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { getEngineerName, initDb, listReports, setEngineerName } from './src/db';
import { DetailScreen } from './src/screens/DetailScreen';
import { EditorScreen } from './src/screens/EditorScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { colors } from './src/theme';
import type { Report } from './src/types';

type Route = { name: 'home' } | { name: 'edit'; id?: string } | { name: 'detail'; id: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [reports, setReports] = useState<Report[]>([]);
  const [engineer, setEngineer] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [list, name] = await Promise.all([listReports(), getEngineerName()]);
    setReports(list);
    setEngineer(name);
  }, []);

  useEffect(() => {
    initDb()
      .then(reload)
      .then(() => setReady(true))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Gagal membuka data'));
  }, [reload]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {route.name === 'home' ? (
        <HomeScreen
          reports={reports}
          engineerName={engineer}
          onCreate={() => setRoute({ name: 'edit' })}
          onOpen={(id) => setRoute({ name: 'detail', id })}
          onSaveName={(name) => {
            setEngineer(name);
            void setEngineerName(name);
          }}
        />
      ) : null}
      {route.name === 'edit' ? (
        <EditorScreen
          reportId={route.id}
          engineerName={engineer}
          onBack={() => {
            void reload().then(() => setRoute({ name: 'home' }));
          }}
          onSaved={(id) => {
            void reload().then(() => setRoute({ name: 'detail', id }));
          }}
        />
      ) : null}
      {route.name === 'detail' ? (
        <DetailScreen
          reportId={route.id}
          onBack={() => {
            void reload().then(() => setRoute({ name: 'home' }));
          }}
          onEdit={(id) => setRoute({ name: 'edit', id })}
          onDeleted={() => {
            void reload().then(() => setRoute({ name: 'home' }));
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, padding: 24 },
  error: { color: colors.danger, textAlign: 'center' },
});
