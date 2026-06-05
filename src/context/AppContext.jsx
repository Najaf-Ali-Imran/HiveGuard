import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Embedded US states — always available even if backend is down
const EMBEDDED_US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming"
];

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('hiveguard-dark-mode');
    return saved === 'true';
  });

  // Form data for full analysis
  const [formData, setFormData] = useState({
    state: '',
    quarter: null,
    temperature_f: '',
    pesticide_proximity: null,
    fungicide_proximity: null,
    honey_supers: null,
    colony_n: 50,
    colony_added: 5,
    colony_reno_pct: 5.0,
    stress_varroa_mites: 0,
    stress_diseases: 0,
    stress_other_pests_parasites: 0,
    stress_pesticides: 0,
    stress_unknown: 0,
    stress_other: 0,
    yield_per_colony: 45,
  });

  // Climate range for selected state+quarter
  const [climateRange, setClimateRange] = useState(null);

  // US States list (embedded fallback + try backend)
  const [usStates] = useState(EMBEDDED_US_STATES);

  // File upload for FULL analysis (both models fuse together)
  const [analysisFiles, setAnalysisFiles] = useState([]);
  const [analysisPreviewUrls, setAnalysisPreviewUrls] = useState([]);

  // File upload for STANDALONE scan
  const [scanFiles, setScanFiles] = useState([]);
  const [scanPreviewUrls, setScanPreviewUrls] = useState([]);

  // Results
  const [analysisResult, setAnalysisResult] = useState(null);
  const [scanResult, setScanResult] = useState(null);

  // Loading states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [analysisStep, setAnalysisStep] = useState(0);

  // History of analyses
  const [analysisHistory, setAnalysisHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('hiveguard-history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [lastAnalysis, setLastAnalysis] = useState(null);

  // Backend status
  const [backendOnline, setBackendOnline] = useState(false);

  // Sync dark mode to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('hiveguard-dark-mode', darkMode.toString());
  }, [darkMode]);

  // Sync history to DOM
  useEffect(() => {
    localStorage.setItem('hiveguard-history', JSON.stringify(analysisHistory));
  }, [analysisHistory]);

  // Check backend health on mount
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(r => r.json())
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  const showScreen = useCallback((screenId) => {
    setCurrentScreen(screenId);
  }, []);

  const updateFormData = useCallback((key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  // Fetch climate range when state+quarter changes (Rule 2)
  const fetchClimateRange = useCallback(async (state, quarter) => {
    if (!state || !quarter) {
      setClimateRange(null);
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/climate/${encodeURIComponent(state)}/${quarter}`);
      if (r.ok) {
        const data = await r.json();
        setClimateRange(data);
      }
    } catch {
      setClimateRange(null);
    }
  }, []);

  // Analysis image handlers (for full analysis with sensor fusion)
  const handleAnalysisImages = useCallback((files) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setAnalysisFiles(prev => [...prev, ...fileArray]);
      setAnalysisPreviewUrls(prev => [...prev, ...fileArray.map(f => URL.createObjectURL(f))]);
    }
  }, []);

  const removeAnalysisImages = useCallback(() => {
    analysisPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    setAnalysisFiles([]);
    setAnalysisPreviewUrls([]);
  }, [analysisPreviewUrls]);

  // Scan image handlers (for standalone disease scan)
  const handleScanImages = useCallback((files) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setScanFiles(prev => [...prev, ...fileArray]);
      setScanPreviewUrls(prev => [...prev, ...fileArray.map(f => URL.createObjectURL(f))]);
    }
  }, []);

  const removeScanImages = useCallback(() => {
    scanPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    setScanFiles([]);
    setScanPreviewUrls([]);
  }, [scanPreviewUrls]);

  // Submit full analysis — multipart form with optional image
  // BOTH models (CNN + Stacking Ensemble v1) fuse together when image is provided
  const submitAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisStep(0);
    setAnalysisResult(null);

    try {
      const fd = new FormData();
      fd.append('state', formData.state);
      fd.append('quarter', formData.quarter.toString());
      fd.append('temperature_f', formData.temperature_f.toString());
      fd.append('pesticide_proximity', formData.pesticide_proximity === true ? 'true' : 'false');
      fd.append('fungicide_proximity', formData.fungicide_proximity === true ? 'true' : 'false');
      fd.append('honey_supers', formData.honey_supers === true ? 'true' : 'false');
      fd.append('colony_n', formData.colony_n.toString());
      fd.append('colony_added', formData.colony_added.toString());
      fd.append('colony_reno_pct', formData.colony_reno_pct.toString());
      fd.append('stress_varroa_mites', formData.stress_varroa_mites.toString());
      fd.append('stress_diseases', formData.stress_diseases.toString());
      fd.append('stress_other_pests_parasites', formData.stress_other_pests_parasites.toString());
      fd.append('stress_pesticides', formData.stress_pesticides.toString());
      fd.append('stress_unknown', formData.stress_unknown.toString());
      fd.append('stress_other', formData.stress_other.toString());
      fd.append('yield_per_colony', formData.yield_per_colony.toString());
      if (analysisFiles.length > 0) {
        analysisFiles.forEach(file => fd.append('files', file));
      }

      const r = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        body: fd,
      });

      if (!r.ok) {
        if (r.status === 503) {
           alert("Model is not connected. Please ensure the backend has the models loaded.");
           setIsAnalyzing(false);
           return;
        }
        const err = await r.json();
        throw new Error(err.detail || 'Analysis failed');
      }

      const data = await r.json();
      setAnalysisResult(data);
      
      const newAnalysis = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        risk: data.prescription?.risk_level || 'Unknown',
        state: formData.state,
        report: data,
        formData: formData
      };
      
      setLastAnalysis(newAnalysis);
      setAnalysisHistory(prev => [newAnalysis, ...prev]);
      
      setCurrentScreen('results');

      // Animate steps with delays
      for (let step = 1; step <= 5; step++) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setAnalysisStep(step);
      }
    } catch (err) {
      alert(`Analysis error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [formData, analysisFiles]);

  // Submit standalone disease scan (CNN only)
  const submitScan = useCallback(async () => {
    if (scanFiles.length === 0) return;
    setIsScanning(true);
    setScanResult(null);

    try {
      const fd = new FormData();
      scanFiles.forEach(file => fd.append('files', file));

      const r = await fetch(`${API_BASE}/scan`, {
        method: 'POST',
        body: fd,
      });

      if (!r.ok) {
        if (r.status === 503) {
          setScanResult({
            result: 'N/A',
            confidence: 0,
            disease: 'Model Not Connected',
            description: 'The vision model is not connected or loaded on the backend. Please check the server.'
          });
          setCurrentScreen('scanResult');
          return;
        }
        const err = await r.json();
        throw new Error(err.detail || 'Scan failed');
      }

      const data = await r.json();
      setScanResult(data);
      setCurrentScreen('scanResult');
    } catch (err) {
      alert(`Scan error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  }, [scanFiles]);

  const resetState = useCallback(() => {
    setFormData({
      state: '',
      quarter: null,
      temperature_f: '',
      pesticide_proximity: null,
      fungicide_proximity: null,
      honey_supers: null,
      apiary_size: 'commercial',
    });
    analysisPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    scanPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    setAnalysisFiles([]);
    setAnalysisPreviewUrls([]);
    setScanFiles([]);
    setScanPreviewUrls([]);
    setAnalysisResult(null);
    setScanResult(null);
    setLastAnalysis(null);
    setClimateRange(null);
    setAnalysisStep(0);
    setCurrentScreen('home');
  }, [analysisPreviewUrls, scanPreviewUrls]);

  const clearHistory = useCallback(() => {
    setAnalysisHistory([]);
    setLastAnalysis(null);
    localStorage.removeItem('hiveguard-history');
  }, []);

  const viewHistoryItem = useCallback((historyItem) => {
    setAnalysisResult(historyItem.report);
    if (historyItem.formData) {
      setFormData(historyItem.formData);
    }
    setAnalysisStep(5);
    setCurrentScreen('results');
  }, []);

  const value = {
    currentScreen, darkMode, formData, climateRange, usStates,
    analysisFiles, analysisPreviewUrls,
    scanFiles, scanPreviewUrls,
    analysisResult, scanResult,
    isAnalyzing, isScanning, analysisStep, lastAnalysis, analysisHistory, backendOnline,
    showScreen, toggleDarkMode, updateFormData, fetchClimateRange,
    handleAnalysisImages, removeAnalysisImages,
    handleScanImages, removeScanImages,
    submitAnalysis, submitScan, resetState, viewHistoryItem, clearHistory,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
