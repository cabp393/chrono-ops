import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { SileoToastProvider } from './lib/sileoToast.jsx';
import '../styles.css';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-fallback">
          <h1>La app encontró un error</h1>
          <p>Prueba recargar la página. Si persiste, limpia el almacenamiento local del navegador.</p>
        </main>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <SileoToastProvider>
        <App />
      </SileoToastProvider>
    </RootErrorBoundary>
  </React.StrictMode>
);
