import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', padding: '2rem' }}>
          <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <div style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.5rem', color: '#DC2626', fontWeight: 'bold' }}>!</span>
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0F172A', marginBottom: '0.5rem' }}>Có lỗi xảy ra</h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {this.state.error?.message || 'Unknown error'}
            </p>
            <pre style={{ fontSize: '0.75rem', textAlign: 'left', color: '#94A3B8', background: '#F8FAFC', padding: '0.75rem', borderRadius: '0.75rem', overflow: 'auto', maxHeight: '10rem', marginBottom: '1rem' }}>
              {this.state.error?.stack || ''}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
              style={{ padding: '0.625rem 1.5rem', borderRadius: '0.75rem', fontWeight: 'bold', fontSize: '0.875rem', color: '#FFFFFF', background: '#F97316', border: 'none', cursor: 'pointer' }}
            >
              Thử lại
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
