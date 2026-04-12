import React, { useState } from 'react';

export default function RateSheet({ currentUser, onClose }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (rating === 0) return;
    try { localStorage.setItem(`coinova_rating_${currentUser?.uid}`, JSON.stringify({ rating, feedback, date: new Date().toISOString() })); } catch {}
    setSubmitted(true);
  }

  return (
    <div className="sheet-slide-in" style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="safe-top" style={{ padding: '0 20px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Rate Coinova</div>
        <div onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Thank you!</div>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto 24px' }}>{rating >= 4 ? 'We\'re glad you\'re enjoying Coinova!' : 'We\'ll work hard to improve your experience.'}</div>
            <button onClick={onClose} style={{ padding: '12px 32px', borderRadius: 12, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', width: '100%', maxWidth: 320 }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(145deg, #1A1A2E, #16213E)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 32px rgba(10,108,255,0.25)' }}>
              <svg width="40" height="40" viewBox="0 0 64 64" fill="none"><rect x="12" y="38" width="40" height="7" rx="3.5" fill="#0A6CFF" opacity="0.25"/><rect x="15" y="29" width="34" height="7" rx="3.5" fill="#0A6CFF" opacity="0.45"/><rect x="18" y="20" width="28" height="7" rx="3.5" fill="#0A6CFF" opacity="0.7"/><rect x="21" y="11" width="22" height="7" rx="3.5" fill="#0A6CFF"/><path d="M32 52V44" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round"/><path d="M28 48L32 44L36 48" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Enjoying Coinova?</div>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 24, lineHeight: 1.5 }}>We'd love to hear your feedback. Tap a star to rate your experience.</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map(star => (<div key={star} onClick={() => setRating(star)} style={{ cursor: 'pointer', transition: 'transform 0.15s ease', transform: rating >= star ? 'scale(1.15)' : 'scale(1)' }}><svg width="36" height="36" viewBox="0 0 24 24" fill={rating >= star ? '#F59E0B' : 'none'} stroke={rating >= star ? '#F59E0B' : 'var(--border)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>))}
            </div>
            {rating > 0 && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 16 }}>{rating === 5 ? 'Amazing! 🤩' : rating === 4 ? 'Great! 😊' : rating === 3 ? 'Good 👍' : rating === 2 ? 'Could be better 🤔' : 'We\'ll do better 😔'}</div>}
            {rating > 0 && <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder={rating >= 4 ? 'What do you love about Coinova? (optional)' : 'How can we improve? (optional)'} maxLength={500} rows={3} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--surface2)', border: '1.5px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', resize: 'none', lineHeight: 1.5, boxSizing: 'border-box', marginBottom: 16 }} />}
            {rating > 0 && <button onClick={handleSubmit} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Submit Feedback</button>}
          </div>
        )}
      </div>
    </div>
  );
}
