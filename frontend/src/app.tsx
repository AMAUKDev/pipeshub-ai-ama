import 'src/global.css';

// ----------------------------------------------------------------------

import { Provider } from 'react-redux';
import { Box, Typography } from '@mui/material';

import { Router } from 'src/routes/sections';

import { useScrollToTop } from 'src/hooks/use-scroll-to-top';

import { LocalizationProvider } from 'src/locales';
import { AdminProvider } from 'src/context/AdminContext';
import { I18nProvider } from 'src/locales/i18n-provider';
import { ThemeProvider } from 'src/theme/theme-provider';

import { Snackbar } from 'src/components/snackbar';
import { ProgressBar } from 'src/components/progress-bar';
import { MotionLazy } from 'src/components/animate/motion-lazy';
import { SettingsDrawer, defaultSettings, SettingsProvider } from 'src/components/settings';

import { AuthProvider as JwtAuthProvider } from 'src/auth/context/jwt';
import { ServicesHealthProvider } from 'src/context/ServicesHealthContext';
import { HealthGate } from 'src/components/guard/HealthGate';

import store from './store/store';
import { ErrorProvider } from './utils/axios';

// ----------------------------------------------------------------------

const AuthProvider = JwtAuthProvider;

// Build info component
function BuildInfoBadge() {
  const buildTime = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();
  const buildDate = new Date(buildTime);
  const formattedBuildTime = buildDate.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: '#fff',
        padding: '12px 16px',
        borderRadius: '6px',
        fontSize: '0.8rem',
        fontFamily: 'monospace',
        backdropFilter: 'blur(8px)',
        border: '2px solid rgba(76, 175, 80, 0.6)',
        maxWidth: '220px',
        wordBreak: 'break-word',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <Typography sx={{ fontSize: '0.8rem', color: '#4CAF50', margin: 0, fontWeight: 'bold' }}>
        🔨 BUILT: {formattedBuildTime}
      </Typography>
    </Box>
  );
}

export default function App() {
  useScrollToTop();

  return (
    <I18nProvider>
      <LocalizationProvider>
        <AuthProvider>
          <Provider store={store}>
            <SettingsProvider settings={defaultSettings}>
              <ThemeProvider>
                <AdminProvider>
                  <MotionLazy>
                    <Snackbar />
                    <ProgressBar />
                    <SettingsDrawer />
                    <ErrorProvider>
                      <ServicesHealthProvider>
                        <HealthGate>
                          <Router />
                          <BuildInfoBadge />
                        </HealthGate>
                      </ServicesHealthProvider>
                    </ErrorProvider>
                  </MotionLazy>
                </AdminProvider>
              </ThemeProvider>
            </SettingsProvider>
          </Provider>
        </AuthProvider>
      </LocalizationProvider>
    </I18nProvider>
  );
}
