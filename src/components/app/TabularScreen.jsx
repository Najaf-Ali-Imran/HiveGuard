import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft, Thermometer, AlertTriangle, CheckCircle, MapPin,
  Brain, Loader2, Droplets, Box, Building2, Upload, X, Camera, Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ImageOrientationModal from '../ImageOrientationModal';

const TooltipIcon = ({ text }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFading, setIsFading] = useState(false);
  
  useEffect(() => {
    let fadeTimer, closeTimer;
    if (isOpen) {
      setIsFading(false);
      fadeTimer = setTimeout(() => setIsFading(true), 4500);
      closeTimer = setTimeout(() => setIsOpen(false), 5000);
    }
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [isOpen]);
  
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <Info 
        size={14} 
        className="text-muted" 
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
      />
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#1E293B',
          color: '#F8FAFC',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          width: '220px',
          zIndex: 50,
          marginBottom: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          textAlign: 'center',
          lineHeight: '1.4',
          fontWeight: 'normal',
          pointerEvents: 'auto',
          opacity: isFading ? 0 : 1,
          transition: 'opacity 0.5s ease'
        }}>
          {text}
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, cursor: 'default' }} 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          />
        </div>
      )}
    </span>
  );
};

export default function TabularScreen() {
  const {
    showScreen, formData, updateFormData, usStates,
    climateRange, fetchClimateRange,
    submitAnalysis, isAnalyzing,
    analysisFiles, analysisPreviewUrls, handleAnalysisImages, removeAnalysisImages,
  } = useApp();

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (formData.state && formData.quarter) {
      fetchClimateRange(formData.state, formData.quarter);
    }
  }, [formData.state, formData.quarter, fetchClimateRange]);

  const isFormValid =
    formData.state &&
    formData.quarter &&
    formData.temperature_f !== '' &&
    formData.pesticide_proximity !== null &&
    formData.fungicide_proximity !== null &&
    formData.honey_supers !== null;

  const [pendingFiles, setPendingFiles] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);

  const openModal = useCallback((files) => {
    if (!files || files.length === 0) return;
    setPendingFiles(files);
    setPendingPreview(URL.createObjectURL(files[0]));
  }, []);

  const onFileChange = (e) => {
    if (e.target.files?.length > 0) openModal(e.target.files);
  };

  const onRemoveImage = (e) => {
    e.stopPropagation();
    removeAnalysisImages();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleModalConfirm = useCallback((rotationDeg) => {
    if (!pendingFiles) return;
    if (rotationDeg === 0) {
      handleAnalysisImages(pendingFiles);
    } else {
      applyRotationAndAdd(pendingFiles[0], rotationDeg, handleAnalysisImages);
    }
    URL.revokeObjectURL(pendingPreview);
    setPendingFiles(null);
    setPendingPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [pendingFiles, pendingPreview, handleAnalysisImages]);

  const handleModalCancel = useCallback(() => {
    URL.revokeObjectURL(pendingPreview);
    setPendingFiles(null);
    setPendingPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [pendingPreview]);

  return (
    <div className="app-screen" key="tabular">
      <div className="screen-header">
        <button className="screen-header__back" onClick={() => showScreen('home')} aria-label="Go back">
          <ArrowLeft size={24} />
        </button>
        <div>
          <p className="screen-header__title">Full Hive Analysis</p>
          <p className="screen-header__subtitle">Environment + Image → 5-Layer AI</p>
        </div>
      </div>

      <div className="screen-content">

        {/* 1. US State */}
        <label className="form-label">
          <MapPin size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
          US State
        </label>
        <div className="select-wrapper">
          <select
            className="select-field"
            value={formData.state}
            onChange={(e) => updateFormData('state', e.target.value)}
            id="state-select"
          >
            <option value="">Select state...</option>
            {usStates.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* 2. Quarter */}
        <label className="form-label">Season / Quarter</label>
        <div className="season-selector">
          {[1, 2, 3, 4].map(q => (
            <button
              key={q}
              className={`season-btn ${formData.quarter === q ? 'season-btn--active' : ''}`}
              onClick={() => updateFormData('quarter', q)}
            >
              Q{q}
            </button>
          ))}
        </div>

        {/* 13. Temperature (Fahrenheit) Typed Input */}
        <label className="form-label">
          <Thermometer size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
          Ambient Temperature (°F)
        </label>
        {climateRange && (
          <p className="form-hint">
            Valid: {climateRange.min_f}°F – {climateRange.max_f}°F ({climateRange.quarter_label})
          </p>
        )}
        <div className="input-wrapper" style={{ marginBottom: '18px' }}>
          <input
            className="input-field"
            type="number"
            placeholder={climateRange ? `${climateRange.min_f} – ${climateRange.max_f}` : 'e.g. 80'}
            value={formData.temperature_f}
            onChange={(e) => updateFormData('temperature_f', e.target.value)}
            min={climateRange?.min_f}
            max={climateRange?.max_f}
            id="temp-input"
          />
          <span className="input-icon"><Thermometer size={20} /></span>
        </div>

        {/* KB Logic Fields */}
        <label className="form-label">
          <Droplets size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
          Pesticide Proximity (3mi)
        </label>
        <div className="radio-group">
          <label className={`radio-option ${formData.pesticide_proximity === true ? 'radio-option--selected-yes' : ''}`}>
            <input type="radio" name="pesticide" checked={formData.pesticide_proximity === true}
              onChange={() => updateFormData('pesticide_proximity', true)} />
            <span className="radio-option__text">Yes</span>
            <AlertTriangle size={16} className="radio-option__icon text-honey" />
          </label>
          <label className={`radio-option ${formData.pesticide_proximity === false ? 'radio-option--selected-no' : ''}`}>
            <input type="radio" name="pesticide" checked={formData.pesticide_proximity === false}
              onChange={() => updateFormData('pesticide_proximity', false)} />
            <span className="radio-option__text">No</span>
            <CheckCircle size={16} className="radio-option__icon text-cyan" />
          </label>
        </div>

        <label className="form-label">
          <Droplets size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
          Fungicide Proximity (3mi)
        </label>
        <div className="radio-group">
          <label className={`radio-option ${formData.fungicide_proximity === true ? 'radio-option--selected-yes' : ''}`}>
            <input type="radio" name="fungicide" checked={formData.fungicide_proximity === true}
              onChange={() => updateFormData('fungicide_proximity', true)} />
            <span className="radio-option__text">Yes</span>
            <AlertTriangle size={16} className="radio-option__icon text-honey" />
          </label>
          <label className={`radio-option ${formData.fungicide_proximity === false ? 'radio-option--selected-no' : ''}`}>
            <input type="radio" name="fungicide" checked={formData.fungicide_proximity === false}
              onChange={() => updateFormData('fungicide_proximity', false)} />
            <span className="radio-option__text">No</span>
            <CheckCircle size={16} className="radio-option__icon text-cyan" />
          </label>
        </div>

        <label className="form-label">
          <Box size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
          Honey Supers Installed?
        </label>
        <div className="radio-group">
          <label className={`radio-option ${formData.honey_supers === true ? 'radio-option--selected-yes' : ''}`}>
            <input type="radio" name="supers" checked={formData.honey_supers === true}
              onChange={() => updateFormData('honey_supers', true)} />
            <span className="radio-option__text">Yes</span>
          </label>
          <label className={`radio-option ${formData.honey_supers === false ? 'radio-option--selected-no' : ''}`}>
            <input type="radio" name="supers" checked={formData.honey_supers === false}
              onChange={() => updateFormData('honey_supers', false)} />
            <span className="radio-option__text">No</span>
          </label>
        </div>

        <hr style={{ margin: '20px 0', borderColor: 'var(--border-light)' }} />

        {/* Biological Metrics */}
        
        {/* 3 & 4. Colony Management (Number Inputs) */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Total Colonies
              <TooltipIcon text="An integer representing the number of honey bee colonies managed at the start of the observed quarter." />
            </label>
            <input
              className="input-field"
              type="number"
              value={formData.colony_n}
              onChange={(e) => updateFormData('colony_n', parseInt(e.target.value) || 0)}
              min={1}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Added Colonies
              <TooltipIcon text="The number of new colonies that were added to the apiary during the quarter." />
            </label>
            <input
              className="input-field"
              type="number"
              value={formData.colony_added}
              onChange={(e) => updateFormData('colony_added', parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>
        </div>

        {/* 12. Yield Per Colony (Number Input) */}
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Box size={14} style={{ display: 'inline', verticalAlign: -2 }} />
          Honey Yield (lbs/colony)
          <TooltipIcon text="A float representing the honey yield per colony in pounds. It is a key proxy indicator for colony health and foraging efficiency." />
        </label>
        <div className="input-wrapper" style={{ marginBottom: '18px' }}>
          <input
            className="input-field"
            type="number"
            value={formData.yield_per_colony}
            onChange={(e) => updateFormData('yield_per_colony', parseFloat(e.target.value) || 0)}
            min={0}
          />
        </div>

        {/* 5-11. Stressors (Sliders 0-100%) */}
        {[
          { key: 'colony_reno_pct', label: 'Colony Renovation', tooltip: 'The percentage of colonies that underwent renovation, which typically means they were requeened.' },
          { key: 'stress_varroa_mites', label: 'Varroa Mites Stress', tooltip: 'The percentage of colonies exhibiting active Varroa destructor mite infestations.' },
          { key: 'stress_diseases', label: 'Diseases Stress', tooltip: 'The percentage of colonies affected by pathogenic infections.' },
          { key: 'stress_other_pests_parasites', label: 'Other Pests/Parasites', tooltip: 'The percentage of colonies showing parasitic loads other than Varroa.' },
          { key: 'stress_pesticides', label: 'Pesticides Stress', tooltip: 'The percentage of colonies that suffered self-reported or survey-detected pesticide exposure events.' },
          { key: 'stress_unknown', label: 'Unknown Stress', tooltip: 'A residual stressor category used to classify colonies that collapsed or showed stress symptoms without a clearly identifiable biological or environmental cause.' },
          { key: 'stress_other', label: 'Other Stress', tooltip: 'Another residual category used for miscellaneous stressors that do not neatly fit into diseases, mites, known pests, or pesticides.' }
        ].map((item) => (
          <div key={item.key} style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {item.label}
                <TooltipIcon text={item.tooltip} />
              </span>
              <span style={{ fontWeight: 'bold' }}>{formData[item.key]}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={formData[item.key]}
              onChange={(e) => updateFormData(item.key, parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        ))}

        <hr style={{ margin: '20px 0', borderColor: 'var(--border-light)' }} />

        {/* Bee Image Upload — for Sensor Fusion (both models) */}
        <label className="form-label">
          <Camera size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
          Bee Specimen Photo (optional)
        </label>
        <p className="form-hint" style={{ marginTop: 0, marginBottom: 8 }}>
          Upload a photo to activate CNN vision model alongside tabular AI
        </p>

        {analysisFiles.length === 0 ? (
          <div
            className="upload-zone upload-zone--compact"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <Upload size={24} className="upload-zone__icon" />
            <p className="upload-zone__title">Add Bee Photo</p>
            <p className="upload-zone__subtitle">Enables dual-model sensor fusion</p>
            <input type="file" ref={fileInputRef} accept="image/*" multiple
              onChange={onFileChange} className="visually-hidden" />
          </div>
        ) : (
          <div className="image-preview-card">
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', alignItems: 'center' }}>
               {analysisPreviewUrls.map((url, i) => (
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
              <p className="image-preview-card__name">{analysisFiles.length} photos selected</p>
              <div className="image-preview-card__status">
                <CheckCircle size={14} />
                <span>CNN + Stacking Ensemble fusion active</span>
              </div>
            </div>
            <button className="image-preview-card__remove" onClick={onRemoveImage} aria-label="Remove all">
              <X size={14} />
            </button>
            <input type="file" ref={fileInputRef} accept="image/*" multiple
              onChange={onFileChange} className="visually-hidden" />
          </div>
        )}

        {/* Submit */}
        <button
          className="btn btn--primary"
          onClick={submitAnalysis}
          disabled={!isFormValid || isAnalyzing}
          id="btn-run-analysis"
          style={{ marginTop: 12, opacity: (!isFormValid || isAnalyzing) ? 0.5 : 1 }}
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={20} className="spin" />
              Running 4-Layer AI Pipeline...
            </>
          ) : (
            <>
              <Brain size={20} />
              Run Full AI Analysis
            </>
          )}
        </button>
      </div>
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
