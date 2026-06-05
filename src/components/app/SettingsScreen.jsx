import { Moon, Sun, Trash2, Clock, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import HoneycombLogo from '../HoneycombLogo';

export default function SettingsScreen() {
  const { darkMode, toggleDarkMode, resetState, analysisHistory, viewHistoryItem, clearHistory } = useApp();

  return (
    <div className="app-screen" key="settings">
      {/* Header */}
      <div className="screen-header">
        <p className="screen-header__title" style={{ fontSize: '20px' }}>Settings</p>
      </div>

      {/* Content */}
      <div className="screen-content">
        {/* Appearance */}
        <div className="settings-group">
          <p className="settings-group__title">Appearance</p>
          <div className="settings-item">
            <div className="settings-item__left">
              <div className="settings-item__icon settings-item__icon--honey">
                {darkMode ? <Moon size={18} /> : <Sun size={18} />}
              </div>
              <div>
                <p className="settings-item__label">Dark Mode</p>
                <p className="settings-item__desc">
                  {darkMode ? 'Currently using dark theme' : 'Currently using light theme'}
                </p>
              </div>
            </div>
            <button
              className={`toggle-switch ${darkMode ? 'toggle-switch--active' : ''}`}
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              id="settings-dark-mode"
            >
              <span className="toggle-switch__knob" />
            </button>
          </div>
        </div>


        {/* History */}
        <div className="settings-group">
          <p className="settings-group__title">History</p>
          {analysisHistory.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
              No history available yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {analysisHistory.map((item) => (
                <div 
                  key={item.id}
                  className="settings-item"
                  style={{ cursor: 'pointer', padding: '12px 16px' }}
                  onClick={() => viewHistoryItem(item)}
                >
                  <div className="settings-item__left">
                    <div className="settings-item__icon" style={{ backgroundColor: 'rgba(250, 129, 18, 0.1)', color: 'var(--color-honey)' }}>
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="settings-item__label">{item.timestamp}</p>
                      <p className="settings-item__desc">
                        State: {item.state} • Risk: <strong style={{ color: item.risk === 'High' ? '#ef4444' : item.risk === 'Medium' ? '#f59e0b' : '#22c55e' }}>{item.risk}</strong>
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--text-tertiary)" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data */}
        <div className="settings-group">
          <p className="settings-group__title">Data</p>
          <button className="btn btn--danger" onClick={resetState} id="btn-reset-data">
            <Trash2 size={18} />
            Clear Current Analysis Form
          </button>
          <button className="btn btn--danger" onClick={clearHistory} id="btn-clear-history" style={{ marginTop: '12px' }}>
            <Trash2 size={18} />
            Clear All History
          </button>
        </div>
      </div>
    </div>
  );
}
