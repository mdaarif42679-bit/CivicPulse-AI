import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ImageIcon, Loader2, Mic, Send, Square, X } from 'lucide-react';
import { api } from '../services/api.js';
import { useApp } from '../context.jsx';
import { SeverityBadge } from '../components/Badges.jsx';
import { CATEGORY_OPTIONS, SAMPLE_REPORTS } from '../data/locations.js';
import { pct } from '../utils/format.js';

const MAX = 8 * 1024 * 1024;
const MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];

export default function SubmitReport() {
  const { status, refresh, toast } = useApp();
  const [text, setText] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [audio, setAudio] = useState(null);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const rec = useRef(null); const stream = useRef(null); const timer = useRef(null);
  const audioUrl = useMemo(() => (audio ? URL.createObjectURL(audio) : null), [audio]);
  const canRecord = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const demo = status?.mode !== 'gemini';

  useEffect(() => () => { clearInterval(timer.current); stream.current?.getTracks().forEach((t) => t.stop()); }, []);
  useEffect(() => { if (!image) { setPreview(null); return; } const u = URL.createObjectURL(image); setPreview(u); return () => URL.revokeObjectURL(u); }, [image]);

  const pickImage = (f) => { setError(''); if (!f) return; if (!f.type.startsWith('image/') || f.size > MAX) { setError('Choose an image file under 8 MB.'); return; } setImage(f); };
  async function startRec() {
    setError('');
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MIMES.find((m) => MediaRecorder.isTypeSupported(m));
      const mr = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = () => {
        const type = (mr.mimeType || 'audio/webm').split(';')[0];
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(chunks, { type });
        if (blob.size > MAX) setError('Recording is too large. Keep voice notes short.'); else setAudio(new File([blob], `voice.${ext}`, { type }));
        stream.current?.getTracks().forEach((t) => t.stop());
      };
      mr.start(); rec.current = mr; setRecording(true); setSecs(0);
      timer.current = setInterval(() => setSecs((s) => { if (s >= 59) { stopRec(); return s; } return s + 1; }), 1000);
    } catch { setError('Microphone access was blocked. Allow it in the browser, or upload an audio file instead.'); }
  }
  function stopRec() { clearInterval(timer.current); rec.current?.state === 'recording' && rec.current.stop(); setRecording(false); }

  async function submit(e) {
    e.preventDefault(); setError('');
    if (text.trim().length < 10 && !(audio && !demo)) { setError(demo && audio ? 'Demo Mode cannot transcribe audio. Add a text description of at least 10 characters.' : 'Describe the problem in at least 10 characters.'); return; }
    const fd = new FormData();
    fd.append('description', text); fd.append('location', location); fd.append('category', category);
    if (image) fd.append('image', image); if (audio) fd.append('audio', audio);
    setSending(true);
    try { const out = await api.submit(fd); setResult(out); refresh(); toast('Report received'); }
    catch (err) { setError(err.message); } finally { setSending(false); }
  }
  const reset = () => { setResult(null); setText(''); setLocation(''); setCategory(''); setImage(null); setAudio(null); };

  if (result) {
    const a = result.report.aiAnalysis, i = result.issue;
    return (
      <div style={{ maxWidth: 680 }}>
        <div className="notice ok"><CheckCircle2 color="#34d399" /><div><b>Report received and analyzed.</b><div className="muted">{result.created ? 'No similar report was found, so a new issue was opened.' : `It matched earlier reports (similarity ${result.score?.toFixed(2)}) and was added to an existing issue.`} A person still needs to verify it.</div></div></div>
        <div className="card" style={{ marginTop: 16 }}>
          <dl className="kv" style={{ margin: 0 }}>
            <dt>Detected problem</dt><dd>{a.title}</dd><dt>Category</dt><dd>{a.category}</dd>
            <dt>Severity</dt><dd><SeverityBadge level={a.severity} /></dd><dt>AI confidence</dt><dd>{pct(a.confidence)}</dd>
            <dt>Issue</dt><dd>{i.title} ({i.reportIds.length} report{i.reportIds.length === 1 ? '' : 's'})</dd>
          </dl>
          <div className="row" style={{ marginTop: 16 }}>
            <Link className="btn primary" to={`/issues/${i.id}`}>View issue</Link>
            <Link className="btn" to={`/reports/${result.report.id}`}>View report</Link>
            <button className="btn ghost" onClick={reset}>Submit another</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="page-head"><div><h1>Submit a report</h1><p>Describe a local problem. No name or contact details are needed.</p></div></div>
      <form className="split" onSubmit={submit} noValidate>
        <div className="card">
          <div className="field">
            <label htmlFor="desc">What is the problem?</label>
            <textarea id="desc" className="input" maxLength={1500} value={text} onChange={(e) => setText(e.target.value)} placeholder="For example: Water is accumulating near the main college gate." />
            <div className="row">{SAMPLE_REPORTS.map((s) => <button type="button" key={s.text} className="pill" onClick={() => { setText(s.text); setLocation(s.location); }}>Use sample: {s.text.slice(0, 26)}...</button>)}</div>
          </div>
          <div className="grid g2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field"><label htmlFor="loc">Location</label><input id="loc" className="input" maxLength={120} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional, e.g. Main College Gate" /><span className="hint">If blank, AI tries to find it in your text.</span></div>
            <div className="field"><label htmlFor="cat">Category</label><select id="cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Auto-detect</option>{CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}</select></div>
          </div>
          {error && <div className="notice err" role="alert" style={{ marginBottom: 14 }}>{error}</div>}
          <button className="btn primary" type="submit" disabled={sending}>{sending ? <><Loader2 size={16} className="spin" /> Analyzing...</> : <><Send size={16} /> Submit and analyze</>}</button>
        </div>
        <div className="grid">
          <div className="card">
            <div className="field"><label><ImageIcon size={14} /> Photo (optional)</label>
              {preview ? <div><img className="photo" src={preview} alt="Selected upload preview" /><button type="button" className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => setImage(null)}><X size={14} /> Remove</button></div>
                : <input className="input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => pickImage(e.target.files[0])} aria-label="Upload a photo" />}
              <span className="hint">JPG, PNG, WebP or GIF, up to 8 MB.</span></div>
          </div>
          <div className="card">
            <div className="field"><label><Mic size={14} /> Voice note (optional)</label>
              {audio ? <div><audio controls src={audioUrl} style={{ width: '100%' }} /><button type="button" className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => setAudio(null)}><X size={14} /> Remove</button></div> : <>
                {canRecord ? (recording ? <button type="button" className="btn danger" onClick={stopRec}><Square size={14} /> Stop recording ({secs}s)</button> : <button type="button" className="btn" onClick={startRec}><Mic size={16} /> Record</button>) : null}
                <input className="input" type="file" accept="audio/*" onChange={(e) => { const f = e.target.files[0]; if (f && f.size <= MAX) setAudio(f); else if (f) setError('Audio must be under 8 MB.'); }} aria-label="Upload an audio file" />
              </>}
              <span className="hint">{demo ? 'Demo Mode stores the audio but does not transcribe it. Please also write a description.' : 'Gemini will transcribe the voice note and use it in the analysis.'}</span></div>
          </div>
        </div>
      </form>
    </>
  );
}
