import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import App from './App';
import { AppSettingsProvider } from './settings';
import { ConfirmProvider } from './components/common/ConfirmDialog';
import { AuthProvider } from './context/AuthContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppSettingsProvider>
      <I18nextProvider i18n={i18n}>
        <ConfirmProvider>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </ConfirmProvider>
      </I18nextProvider>
    </AppSettingsProvider>
  </React.StrictMode>,
);
