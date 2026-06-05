import { useState, useCallback } from 'react';
import { RotateCcw, RotateCw, Check, X, AlertTriangle } from 'lucide-react';

/**
 * ImageOrientationModal
 * Props:
 *   imageUrl    – the object URL of the uploaded image to preview
 *   onConfirm   – callback(rotationDeg) called when user confirms
 *   onCancel    – callback called when user cancels / closes
 */
export default function ImageOrientationModal({ imageUrl, onConfirm, onCancel }) {
  const [rotation, setRotation] = useState(0);

  const rotateLeft = useCallback(() => setRotation(r => (r - 90 + 360) % 360), []);
  const rotateRight = useCallback(() => setRotation(r => (r + 90) % 360), []);

  const handleConfirm = () => onConfirm(rotation);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-sheet__header">
          <div>
            <p className="modal-sheet__title">Adjust Image Orientation</p>
            <p className="modal-sheet__subtitle">The ML model requires the bee to be vertical</p>
          </div>
          <button className="modal-sheet__close" onClick={onCancel} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Main preview area */}
        <div className="modal-sheet__body">
          {/* Image Preview */}
          <div className="orientation-preview-wrap">
            <img
              src={imageUrl}
              alt="Bee specimen preview"
              className="orientation-preview-img"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          </div>

          {/* Rotate Controls */}
          <div className="orientation-controls">
            <button className="orientation-btn" onClick={rotateLeft} aria-label="Rotate left 90°">
              <RotateCcw size={22} />
              <span>Rotate Left</span>
            </button>
            <div className="orientation-angle-badge">{rotation}°</div>
            <button className="orientation-btn" onClick={rotateRight} aria-label="Rotate right 90°">
              <RotateCw size={22} />
              <span>Rotate Right</span>
            </button>
          </div>

          {/* Info Infographic */}
          <div className="orientation-guide">
            <div className="orientation-guide__header">
              <AlertTriangle size={14} style={{ color: 'var(--color-honey)', flexShrink: 0 }} />
              <span>Required Image Orientation</span>
            </div>
            <div className="orientation-guide__examples">
              {/* CORRECT */}
              <div className="orientation-example orientation-example--good">
                <div className="orientation-example__frame">
                  {/* Vertical bee SVG */}
                  <svg viewBox="0 0 40 72" width="40" height="72" xmlns="http://www.w3.org/2000/svg">
                    {/* Body */}
                    <ellipse cx="20" cy="42" rx="9" ry="16" fill="#f59e0b" />
                    {/* Stripes */}
                    <rect x="11" y="36" width="18" height="4" rx="2" fill="#1c1c1c" opacity="0.6" />
                    <rect x="11" y="44" width="18" height="4" rx="2" fill="#1c1c1c" opacity="0.6" />
                    {/* Head */}
                    <circle cx="20" cy="22" r="8" fill="#f59e0b" />
                    {/* Antennae */}
                    <line x1="16" y1="15" x2="10" y2="7" stroke="#1c1c1c" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="10" cy="7" r="1.5" fill="#1c1c1c" />
                    <line x1="24" y1="15" x2="30" y2="7" stroke="#1c1c1c" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="30" cy="7" r="1.5" fill="#1c1c1c" />
                    {/* Wings */}
                    <ellipse cx="8" cy="34" rx="7" ry="4" fill="#bfdbfe" opacity="0.8" transform="rotate(-15 8 34)" />
                    <ellipse cx="32" cy="34" rx="7" ry="4" fill="#bfdbfe" opacity="0.8" transform="rotate(15 32 34)" />
                  </svg>
                </div>
                <span className="orientation-example__label orientation-example__label--good">✓ Correct</span>
                <span className="orientation-example__desc">Vertical (head up or down)</span>
              </div>

              {/* DIVIDER */}
              <div className="orientation-guide__vs">vs</div>

              {/* INCORRECT */}
              <div className="orientation-example orientation-example--bad">
                <div className="orientation-example__frame">
                  <svg viewBox="0 0 72 40" width="72" height="40" xmlns="http://www.w3.org/2000/svg">
                    {/* Body horizontal */}
                    <ellipse cx="42" cy="20" rx="16" ry="9" fill="#f59e0b" />
                    <rect x="36" y="11" width="4" height="18" rx="2" fill="#1c1c1c" opacity="0.6" />
                    <rect x="44" y="11" width="4" height="18" rx="2" fill="#1c1c1c" opacity="0.6" />
                    {/* Head */}
                    <circle cx="22" cy="20" r="8" fill="#f59e0b" />
                    {/* Antennae */}
                    <line x1="15" y1="16" x2="7" y2="10" stroke="#1c1c1c" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="7" cy="10" r="1.5" fill="#1c1c1c" />
                    <line x1="15" y1="24" x2="7" y2="30" stroke="#1c1c1c" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="7" cy="30" r="1.5" fill="#1c1c1c" />
                    {/* Wings */}
                    <ellipse cx="34" cy="8" rx="7" ry="4" fill="#bfdbfe" opacity="0.8" transform="rotate(75 34 8)" />
                    <ellipse cx="34" cy="32" rx="7" ry="4" fill="#bfdbfe" opacity="0.8" transform="rotate(-75 34 32)" />
                  </svg>
                </div>
                <span className="orientation-example__label orientation-example__label--bad">✗ Incorrect</span>
                <span className="orientation-example__desc">Horizontal (rotated)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-sheet__footer">
          <button className="btn" onClick={onCancel} style={{ flex: 1, background: 'var(--bg-card-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={handleConfirm} style={{ flex: 1 }} id="btn-confirm-orientation">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
