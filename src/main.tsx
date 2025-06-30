import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Add error boundary for debugging
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ color: '#dc2626' }}>Something went wrong.</h1>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px', textAlign: 'left' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>Error Details</summary>
            {this.state.error && this.state.error.toString()}
            {this.state.error && this.state.error.stack}
          </details>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: '20px', 
              padding: '10px 20px', 
              backgroundColor: '#dc2626', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer' 
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

try {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h1 style="color: #dc2626;">Application Failed to Load</h1>
      <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
      <p>Check the console for more details.</p>
      <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background-color: #dc2626; color: white; border: none; border-radius: 5px; cursor: pointer;">
        Reload Page
      </button>
    </div>
  `;
}