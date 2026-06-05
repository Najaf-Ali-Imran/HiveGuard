import {
  Cpu, Search, ShieldCheck, Brain, FileText, Check, X, AlertTriangle,
  ChevronRight, Home, Loader2, Zap, Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useRef } from 'react';
import html2pdf from 'html2pdf.js';

function StepHeader({ stepNum, title, icon: Icon, isActive, isComplete }) {
  return (
    <div className={`analysis-step__header ${isActive ? 'analysis-step__header--active' : ''}`}>
      <div className={`step-indicator ${isComplete ? 'step-indicator--done' : isActive ? 'step-indicator--active' : ''}`}>
        {isComplete ? <Check size={14} /> : isActive ? <Loader2 size={14} className="spin" /> : stepNum}
      </div>
      <Icon size={18} />
      <span className="analysis-step__title">{title}</span>
    </div>
  );
}

function SensorFusionStep({ data }) {
  if (!data) return null;

  // Determine CNN card styling based on result
  const cnnStatus = data.cnn_varroa;
  const cnnCardClass = cnnStatus === 'Infected' ? 'fusion-card--severe'
    : cnnStatus === 'Healthy' ? 'fusion-card--low'
    : 'fusion-card--neutral';

  return (
    <div className="analysis-step__content slide-up">
      <div className="fusion-grid">
        <div className={`fusion-card ${data.regional_risk === 'Severe' ? 'fusion-card--severe' : data.regional_risk === 'Medium' ? 'fusion-card--medium' : 'fusion-card--low'}`}>
          <p className="fusion-card__label">Regional Risk</p>
          <p className="fusion-card__value">{data.regional_risk}</p>
        </div>
        <div className={`fusion-card ${data.pesticide_risk === 'High' ? 'fusion-card--severe' : 'fusion-card--low'}`}>
          <p className="fusion-card__label">Pesticide Risk</p>
          <p className="fusion-card__value">{data.pesticide_risk}</p>
        </div>
        <div className={`fusion-card ${cnnCardClass}`}>
          <p className="fusion-card__label">CNN Varroa Diagnostic</p>
          <p className="fusion-card__value">{cnnStatus === 'N/A' ? 'No Image' : cnnStatus}</p>
          {cnnStatus !== 'N/A' && (
            <p className="fusion-card__detail">
              Infection Rate: {(data.infection_rate * 100).toFixed(1)}%
            </p>
          )}
        </div>
      </div>
      <div className="fusion-meta" style={{ marginTop: 12 }}>
        <span className={`model-badge ${data.tabular_model_active ? 'model-badge--active' : ''}`}>
          {data.tabular_model_active ? '✔ Stacking Ensemble v1' : '✖ Tabular Offline'}
        </span>
        <span className={`model-badge ${data.vision_model_active ? 'model-badge--active' : ''}`}>
          {data.vision_model_active ? '✔ ONNX EfficientNet-B4' : '✖ Vision Offline'}
        </span>
      </div>
    </div>
  );
}

function AStarStep({ data }) {
  if (!data) return null;
  return (
    <div className="analysis-step__content slide-up">
      {data.success ? (
        <>
          <div className="astar-cost">
            <Zap size={16} />
            <span>Total intervention cost: <strong>{data.total_cost}</strong> units</span>
          </div>
          <div className="astar-steps">
            {data.steps.map((step, i) => (
              <div key={i} className="astar-step-card slide-up" style={{ animationDelay: `${i * 200}ms` }}>
                <div className="astar-step-card__header">
                  <span className="astar-step-card__num">{step.step}</span>
                  <span className="astar-step-card__label">{step.label}</span>
                  <span className="astar-step-card__cost">{step.expected_cost}</span>
                </div>
                <p className="astar-step-card__rationale">{step.rationale}</p>
                <span className="astar-step-card__efficacy">Efficacy: {step.efficacy}</span>
              </div>
            ))}
          </div>
          {data.rejected_actions.length > 0 && (
            <div className="rejected-section">
              <p className="rejected-section__title">
                <X size={14} /> Rejected Treatments
              </p>
              {data.rejected_actions.map((rej, i) => (
                <div key={i} className="rejected-action">
                  <span className="rejected-action__name">{rej.label}</span>
                  <span className="rejected-action__reason">{rej.reason}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="error-card">
          <AlertTriangle size={20} />
          <p>{data.error || 'No safe intervention path found.'}</p>
        </div>
      )}
    </div>
  );
}



function KBStep({ data }) {
  if (!data) return null;
  return (
    <div className="analysis-step__content slide-up">
      <div className="kb-rules">
        {data.fired_rules.map((rule, i) => (
          <div key={i} className="rule-chip slide-up" style={{ animationDelay: `${i * 150}ms` }}>
            <span className="rule-chip__id">{rule.rule_id}</span>
            <span className="rule-chip__name">{rule.name}</span>
          </div>
        ))}
        {data.fired_rules.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No inference rules triggered — colony appears stable.</p>
        )}
      </div>
      {Object.keys(data.deduced_facts).length > 0 && (
        <div className="kb-deduced">
          <p className="kb-deduced__title">Deduced Facts</p>
          {Object.entries(data.deduced_facts).map(([k, v], i) => (
            <div key={i} className="kb-fact">
              <span className="kb-fact__key">{k}</span>
              <span className={`kb-fact__value ${v === 'True' || v === 'High' || v === 'Critical' || v === 'Acute' || v === 'Compromised' ? 'kb-fact__value--danger' : ''}`}>
                {v}
              </span>
            </div>
          ))}
        </div>
      )}
      {data.vetoed_treatments.length > 0 && (
        <div className="kb-veto">
          <AlertTriangle size={14} />
          <span>KB Veto: {data.vetoed_treatments.join('; ')}</span>
        </div>
      )}
    </div>
  );
}

function PrescriptionStep({ data }) {
  if (!data) return null;
  return (
    <div className="analysis-step__content slide-up">
      {/* Prognosis */}
      <div className={`prognosis-card ${
        data.risk_level === 'Critical' ? 'prognosis-card--critical' :
        data.risk_level === 'Unknown' ? 'prognosis-card--stable' : 'prognosis-card--stable'
      }`}>
        <p className="prognosis-card__text">{data.prognosis}</p>
      </div>

      {/* Diagnosis */}
      {data.diagnosis_items.length > 0 && (
        <div className="prescription-section">
          <p className="prescription-section__title">🩺 Diagnosis</p>
          {data.diagnosis_items.map((item, i) => (
            <div key={i} className={`diagnosis-item diagnosis-item--${item.severity}`}>
              <span className="diagnosis-item__fact">{item.fact}</span>
              <span className="diagnosis-item__value">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action Plan */}
      {data.action_plan.length > 0 && (
        <div className="prescription-section">
          <p className="prescription-section__title">📋 Action Plan</p>
          {data.action_plan.map((step, i) => (
            <div key={i} className="action-step slide-up" style={{ animationDelay: `${i * 200}ms` }}>
              <div className="action-step__header">
                <span className="action-step__num">{step.step}</span>
                <span className="action-step__action">{step.action}</span>
                <span className={`action-step__cat action-step__cat--${step.category}`}>
                  {step.category}
                </span>
              </div>
              <p className="action-step__desc">{step.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="prescription-section">
          <p className="prescription-section__title">⚠️ Warnings</p>
          {data.warnings.map((w, i) => (
            <div key={i} className="warning-item">
              <AlertTriangle size={14} />
              <div>
                <p className="warning-item__title">{w.item}</p>
                <p className="warning-item__reason">{w.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResultsScreen() {
  const { analysisResult, analysisStep, resetState } = useApp();
  const reportRef = useRef();

  const downloadPDF = () => {
    if (!reportRef.current) return;
    const element = reportRef.current;
    
    // Create a temporary clone to tweak styles if needed, but direct element usually works
    const opt = {
      margin:       0.5,
      filename:     'HiveGuard_Report.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#FAF3E1' },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  if (!analysisResult) {
    return (
      <div className="app-screen" key="results">
        <div className="screen-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <Loader2 size={32} className="spin text-honey" />
          <p>Processing AI pipeline...</p>
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, title: 'Sensor Fusion', icon: Cpu, component: <SensorFusionStep data={analysisResult.sensor_fusion} /> },
    { num: 2, title: 'A* Search', icon: Search, component: <AStarStep data={analysisResult.a_star} /> },
    { num: 3, title: 'Knowledge Base', icon: Brain, component: <KBStep data={analysisResult.knowledge_base} /> },
    { num: 4, title: 'Prescription', icon: FileText, component: <PrescriptionStep data={analysisResult.prescription} /> },
  ];

  return (
    <div className="app-screen" key="results">
      <div className="screen-header">
        <p className="screen-header__title">AI Analysis Report</p>
      </div>

      <div className="screen-content">
        <div ref={reportRef} className="pdf-report-container" style={{ padding: '4px' }}>
          {/* Header inside PDF for context */}
          <div style={{ marginBottom: 16, display: 'none' }} className="pdf-header">
            <h2>HiveGuard Health Report</h2>
            <p>Generated on: {new Date().toLocaleString()}</p>
          </div>
          
          {steps.map((step) => (
            <div
              key={step.num}
              className={`analysis-step ${analysisStep >= step.num ? 'analysis-step--visible' : ''}`}
            >
              <StepHeader
                stepNum={step.num}
                title={step.title}
                icon={step.icon}
                isActive={analysisStep === step.num}
                isComplete={analysisStep > step.num}
              />
              {analysisStep >= step.num && step.component}
            </div>
          ))}
        </div>

        {analysisStep >= 4 && (
          <div className="slide-up" style={{ display: 'flex', gap: '8px', marginTop: 12 }}>
            <button className="btn btn--primary" onClick={resetState} id="btn-go-home-results" style={{ flex: 1 }}>
              <Home size={20} />
              Home
            </button>
            <button className="btn" onClick={downloadPDF} id="btn-download-pdf" style={{ flex: 1, backgroundColor: 'var(--bg-card-alt)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
              <Download size={20} />
              Save PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
