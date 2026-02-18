import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ScheduleStoreProvider } from './context/ScheduleStore';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ScheduleStoreProvider>
      <App />
    </ScheduleStoreProvider>
  </React.StrictMode>
);
