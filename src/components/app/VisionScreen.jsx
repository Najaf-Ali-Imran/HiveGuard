import { useRef, useState, useCallback } from 'react';
import { ArrowLeft, Upload, X, Microscope, CheckCircle, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ImageOrientationModal from '../ImageOrientationModal';

export default function VisionScreen() {
  const {
    showScreen, scanFiles, scanPreviewUrls,
    handleScanImages, removeScanImages, submitScan, isScanning,
  } = useApp();
  const fileInputRef = useRef(null);

  // Pending files waiting for orientation confirmation
  const [pendingFiles, setPendingFiles] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);

  const openModal = useCallback((files) => {
    if (!files || files.length === 0) return;
    const firstFile = files[0];
    setPendingFiles(files);
    setPendingPreview(URL.createObjectURL(firstFile));
  }, []);

  const onFileChange = (e) => {
    if (e.target.files?.length > 0) openModal(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length > 0) openModal(e.dataTransfer.files);
  };

  const handleModalConfirm = useCallback((rotationDeg) => {
    if (!pendingFiles) return;
    // If the user rotated the image, we apply the rotation on a canvas before uploading
    if (rotationDeg === 0) {
      handleScanImages(pendingFiles);
    } else {
      applyRotationAndAdd(pendingFiles[0], rotationDeg, handleScanImages);
    }
    URL.revokeObjectURL(pendingPreview);
    setPendingFiles(null);
    setPendingPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [pendingFiles, pendingPreview, handleScanImages]);

  const handleModalCancel = useCallback(() => {
    URL.revokeObjectURL(pendingPreview);
    setPendingFiles(null);
    setPendingPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [pendingPreview]);

  const onRemoveImage = (e) => {
    e.stopPropagation();
    removeScanImages();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="app-screen" key="vision">
      {/* Header */}
      <div className="screen-header">
        <button className="screen-header__back" onClick={() => showScreen('home')} aria-label="Go back">
          <ArrowLeft size={24} />
        </button>
        <div>
          <p className="screen-header__title">Disease Scanner</p>
          <p className="screen-header__subtitle">CNN image classification only</p>
        </div>
      </div>

      {/* Content */}
      <div className="screen-content">
        <p className="helper-text">
          Upload a clear, macro photo of a single bee to classify as{' '}
          <strong>Healthy</strong> or <strong>Infected</strong> (Varroa / DWV).
          This uses the EfficientNet-B4 vision model independently.
        </p>

        {/* Upload Zone */}
        {scanFiles.length === 0 && (
          <div
            className="upload-zone"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <Upload size={40} className="upload-zone__icon" />
            <p className="upload-zone__title">Tap to Select Photo</p>
            <p className="upload-zone__subtitle">or Drag &amp; Drop Here</p>
            <input type="file" ref={fileInputRef} accept="image/*" multiple
              onChange={onFileChange} className="visually-hidden" id="file-input" />
          </div>
        )}

        {/* Preview */}
        {scanFiles.length > 0 && scanPreviewUrls.length > 0 && (
          <div className="image-preview-card">
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', alignItems: 'center' }}>
               {scanPreviewUrls.map((url, i) => (
                  <img key={i} src={url} alt={`Bee specimen ${i}`} className="image-preview-card__img" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
               ))}
               <button
                 onClick={() => fileInputRef.current?.click()}
                 style={{ width: 40, height: 40, borderRadius: 4, border: '1px dashed var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}
                 title="Add more photos"
               >
                 <Upload size={16} />
               </button>
            </div>
            <div className="image-preview-card__info">
              <p className="image-preview-card__name">{scanFiles.length} photos selected</p>
              <div className="image-preview-card__status">
                <CheckCircle size={14} />
                <span>Ready for classification</span>
              </div>
            </div>
            <button className="image-preview-card__remove" onClick={onRemoveImage} aria-label="Remove all">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Scan Button */}
        <button
          className="btn btn--primary"
          onClick={submitScan}
          disabled={scanFiles.length === 0 || isScanning}
          style={{ opacity: (scanFiles.length === 0 || isScanning) ? 0.5 : 1 }}
          id="btn-scan"
        >
          {isScanning ? (
            <>
              <Loader2 size={20} className="spin" />
              Classifying...
            </>
          ) : (
            <>
              <Microscope size={20} />
              Classify Image
            </>
          )}
        </button>

        {/* Info */}
        <div className="info-card" style={{ marginTop: 16 }}>
          <p className="info-card__title">How is this different?</p>
          <div className="info-card__steps">
            <div className="info-card__step">
              <span className="info-card__step-num" style={{ background: 'var(--color-cream-dark)', color: 'var(--color-black)' }}>!</span>
              <span>This uses <strong>only</strong> the CNN vision model. For full analysis with both models + A* + KB, use "Full Hive Analysis".</span>
            </div>
          </div>
        </div>
      </div>

      {scanFiles.length > 0 && (
        <input type="file" ref={fileInputRef} accept="image/*" multiple
          onChange={onFileChange} className="visually-hidden" />
      )}

      {/* Orientation Modal */}
      {pendingPreview && (
        <ImageOrientationModal
          imageUrl={pendingPreview}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}
    </div>
  );
}

/** Applies CSS rotation to an image via canvas and returns a File blob */
function applyRotationAndAdd(file, degrees, callback) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const rad = (degrees * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const newW = Math.round(img.width * cos + img.height * sin);
    const newH = Math.round(img.width * sin + img.height * cos);

    const canvas = document.createElement('canvas');
    canvas.width = newW;
    canvas.height = newH;
    const ctx = canvas.getContext('2d');
    ctx.translate(newW / 2, newH / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    canvas.toBlob((blob) => {
      const rotatedFile = new File([blob], file.name, { type: file.type });
      const dt = new DataTransfer();
      dt.items.add(rotatedFile);
      callback(dt.files);
      URL.revokeObjectURL(url);
    }, file.type);
  };
  img.src = url;
}
