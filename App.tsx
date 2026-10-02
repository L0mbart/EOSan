import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { I18nProvider } from './src/i18n';
import { currentSession, getEngineerName, initDb, listReports, loadRegistry, logout, setEngineerName } from './src/db';
import { CustomersScreen } from './src/screens/CustomersScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { EditorScreen } from './src/screens/EditorScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PersonnelScreen } from './src/screens/PersonnelScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { SitesScreen } from './src/screens/SitesScreen';
import { Section, Shell } from './src/screens/Shell';
import { UsersScreen } from './src/screens/UsersScreen';
import { colors } from './src/theme';
import type { Registry, Report, SessionUser } from './src/types';

type Route =
  | { name: 'desk'; section: Section }
  | { name: 'edit'; id?: string; contractId?: string; origin: Section }
  | { name: 'detail'; id: string; origin: Section };

const emptyRegistry: Registry = { customers: [], personnel: [], contracts: [] };

export default function App() {
  return (
    <I18nProvider>
      <AppRoot />
    </I18nProvider>
  );
}

function AppRoot() {
  const [route, setRoute] = useState<Route>({ name: 'desk', section: 'dashboard' });
  const [reports, setReports] = useState<Report[]>([]);
  const [registry, setRegistry] = useState<Registry>(emptyRegistry);
  const [engineer, setEngineer] = useState('');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [list, book, name, session] = await Promise.all([listReports(), loadRegistry(), getEngineerName(), currentSession()]);
    setReports(list);
    setRegistry(book);
    setEngineer(name);
    setUser(session);
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

  if (!user) {
    return (
      <View style={styles.screen}>
        <StatusBar style="light" />
        <LoginScreen
          onLogin={(next) => {
            setUser(next);
            if (!engineer.trim()) {
              setEngineer(next.displayName);
              void setEngineerName(next.displayName);
            }
          }}
        />
      </View>
    );
  }

  const canManage = user.role === 'admin';
  const section: Section = route.name === 'desk' ? route.section : route.origin;

  function openReport(id: string) {
    setRoute({ name: 'detail', id, origin: section === 'users' ? 'dashboard' : section });
  }

  function createReport(contractId: string) {
    setRoute({ name: 'edit', contractId, origin: section === 'users' ? 'dashboard' : section });
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {route.name === 'edit' ? (
        <EditorScreen
          reportId={route.id}
          contractId={route.contractId}
          engineerName={engineer}
          onBack={() => {
            void reload().then(() => setRoute({ name: 'desk', section: route.origin }));
          }}
          onSaved={(id) => {
            void reload().then(() => setRoute({ name: 'detail', id, origin: route.origin }));
          }}
        />
      ) : null}
      {route.name === 'detail' ? (
        <DetailScreen
          reportId={route.id}
          onBack={() => {
            void reload().then(() => setRoute({ name: 'desk', section: route.origin }));
          }}
          onEdit={(id) => setRoute({ name: 'edit', id, origin: route.origin })}
          onDeleted={() => {
            void reload().then(() => setRoute({ name: 'desk', section: route.origin }));
          }}
        />
      ) : null}
      {route.name === 'desk' ? (
        <Shell
          section={route.section === 'users' && !canManage ? 'dashboard' : route.section}
          user={user}
          onNavigate={(next) => setRoute({ name: 'desk', section: next })}
          onLogout={() => {
            void logout().then(() => {
              setUser(null);
              setRoute({ name: 'desk', section: 'dashboard' });
            });
          }}
        >
          {route.section === 'dashboard' ? (
            <DashboardScreen registry={registry} reports={reports} onOpen={openReport} onCreate={createReport} />
          ) : null}
          {route.section === 'reports' ? (
            <ReportsScreen registry={registry} reports={reports} onOpen={openReport} onCreate={createReport} />
          ) : null}
          {route.section === 'customers' ? (
            <CustomersScreen registry={registry} canManage={canManage} onChanged={() => void reload()} />
          ) : null}
          {route.section === 'sites' ? (
            <SitesScreen registry={registry} canManage={canManage} onChanged={() => void reload()} />
          ) : null}
          {route.section === 'personnel' ? (
            <PersonnelScreen registry={registry} canManage={canManage} onChanged={() => void reload()} />
          ) : null}
          {route.section === 'users' && canManage ? <UsersScreen onBack={() => setRoute({ name: 'desk', section: 'dashboard' })} /> : null}
        </Shell>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, padding: 24 },
  error: { color: colors.danger, textAlign: 'center' },
});
