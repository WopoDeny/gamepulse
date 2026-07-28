import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('GamePulse render error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="fatal-state">
        <section className="fatal-state__card">
          <span className="eyebrow">INTERFACE RECOVERY</span>
          <h1>Something interrupted the page.</h1>
          <p>Reloading will restart the interface. No account or payment information is stored here.</p>
          <button className="button button--primary" onClick={() => window.location.reload()}>Reload GamePulse</button>
        </section>
      </main>
    );
  }
}
