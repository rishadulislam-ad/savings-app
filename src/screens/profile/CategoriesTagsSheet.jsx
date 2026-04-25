import React, { useState } from 'react';

const CAT_COLORS = [
  '#667eea', '#f97316', '#ec4899', '#10b981',
  '#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444',
];

const CAT_EMOJIS = ['🏷️','🎮','🏠','📚','🎵','⚽','🌿','🎁','🐾','🍕','☕','🚀','🌟','💡','🎨','🏋️'];

export default function CategoriesTagsSheet({ onClose, customCategories, customTags, onAddCustomCategory, onDeleteCustomCategory, onAddCustomTag, onDeleteCustomTag }) {
  const [view, setView]               = useState('list'); // 'list' | 'addCat'
  const [newCatEmoji, setNewCatEmoji] = useState('🏷️');
  const [newCatName, setNewCatName]   = useState('');
  const [newCatColor, setNewCatColor] = useState('#667eea');
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  function handleAddCategory() {
    if (!newCatName.trim()) return;
    onAddCustomCategory({
      id: `custom_${Date.now()}`,
      label: newCatName.trim(),
      icon: newCatEmoji,
      color: newCatColor,
      bg: `${newCatColor}22`,
    });
    setNewCatName('');
    setNewCatEmoji('🏷️');
    setNewCatColor('#667eea');
    setView('list');
  }

  function handleAddTag() {
    const tag = newTagInput.trim();
    if (!tag) return;
    onAddCustomTag(tag);
    setNewTagInput('');
    setShowTagInput(false);
  }

  return (
    <div
      data-kb-push
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 900, display: 'flex', alignItems: 'flex-end',
        animation: 'fadeIn 0.2s ease both',
      }}
    >
      <div
        data-keyboard-scroll
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: 'var(--surface)',
          borderRadius: '22px 22px 0 0', padding: '0 20px 48px',
          maxHeight: '88dvh', overflowY: 'auto',
          animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '12px auto 0' }} />

        {/* ── Add Category Sub-view ── */}
        {view === 'addCat' && (
          <div style={{ paddingTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button
                onClick={() => setView('list')}
                style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: 'var(--text-secondary)' }}
              >←</button>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>New Category</div>
            </div>

            {/* Emoji + Name */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                border: '1.5px solid var(--border)',
                background: newCatColor + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              }}>{newCatEmoji}</div>
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Category name…"
                className="form-input"
                style={{ flex: 1, margin: 0 }}
                autoFocus
              />
            </div>

            {/* Emoji picker */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Icon</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
              {CAT_EMOJIS.map(em => (
                <button key={em} onClick={() => setNewCatEmoji(em)}
                  style={{
                    width: 38, height: 38, borderRadius: 10,
                    border: `2px solid ${newCatEmoji === em ? newCatColor : 'var(--border)'}`,
                    background: newCatEmoji === em ? newCatColor + '22' : 'var(--surface2)',
                    fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >{em}</button>
              ))}
            </div>

            {/* Color picker */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Color</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {CAT_COLORS.map(col => (
                <div key={col} onClick={() => setNewCatColor(col)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: col,
                    cursor: 'pointer', flexShrink: 0,
                    boxShadow: newCatColor === col ? `0 0 0 2px var(--surface), 0 0 0 4px ${col}` : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                />
              ))}
            </div>

            <button onClick={handleAddCategory} className="btn-primary" style={{ opacity: !newCatName.trim() ? 0.45 : 1 }}>
              ✓ Save Category
            </button>
          </div>
        )}

        {/* ── Main List View ── */}
        {view === 'list' && (
          <div style={{ paddingTop: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                  Categories & Tags
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  Manage your custom categories and tags
                </div>
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16 }}>✕</button>
            </div>

            {/* ── Custom Categories section ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Custom Categories
              </div>
              <button
                onClick={() => setView('addCat')}
                style={{
                  padding: '5px 12px', borderRadius: 20, border: 'none',
                  background: 'var(--accent)', color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >+ Add</button>
            </div>

            {customCategories.length === 0 ? (
              <div style={{
                padding: '20px', background: 'var(--surface2)', borderRadius: 14,
                textAlign: 'center', marginBottom: 20,
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🏷️</div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  No custom categories yet
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Tap "+ Add" to create your first one
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--surface2)', borderRadius: 14, padding: '0 14px', marginBottom: 20 }}>
                {customCategories.map((cat, i) => (
                  <div key={cat.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                    borderBottom: i < customCategories.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 11,
                      background: cat.color + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                    }}>{cat.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{cat.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Custom</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteCustomCategory(cat.id)}
                      style={{
                        width: 30, height: 30, borderRadius: 9,
                        background: 'rgba(239,68,68,0.1)', border: 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#ef4444', fontSize: 14, flexShrink: 0,
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* ── Custom Tags section ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Custom Tags
              </div>
              {!showTagInput && (
                <button
                  onClick={() => setShowTagInput(true)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, border: 'none',
                    background: 'var(--accent)', color: '#fff',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >+ Add</button>
              )}
            </div>

            {/* Add tag input */}
            {showTagInput && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  autoFocus
                  type="text"
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddTag(); if (e.key === 'Escape') { setNewTagInput(''); setShowTagInput(false); } }}
                  placeholder="Tag name…"
                  className="form-input"
                  style={{ flex: 1, margin: 0 }}
                />
                <button onClick={handleAddTag}
                  style={{ padding: '0 16px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
                >Add</button>
                <button onClick={() => { setNewTagInput(''); setShowTagInput(false); }}
                  style={{ padding: '0 12px', borderRadius: 12, border: 'none', background: 'var(--surface2)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
                >Cancel</button>
              </div>
            )}

            {customTags.length === 0 && !showTagInput ? (
              <div style={{
                padding: '20px', background: 'var(--surface2)', borderRadius: 14,
                textAlign: 'center', marginBottom: 20,
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🔖</div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  No custom tags yet
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Tap "+ Add" to create your first tag
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {customTags.map(tag => (
                  <div key={tag} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 10px 6px 12px', borderRadius: 20,
                    background: 'var(--accent-light)',
                    border: '1px solid rgba(10,108,255,0.2)',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{tag}</span>
                    <button
                      onClick={() => onDeleteCustomTag(tag)}
                      style={{
                        width: 18, height: 18, borderRadius: '50%', border: 'none',
                        background: 'rgba(10,108,255,0.15)', color: 'var(--accent)',
                        fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, flexShrink: 0,
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Note about built-in tags */}
            <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 12, marginTop: 4 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                💡 Default tags (Food, Work, Family, etc.) are always available in transactions. Custom tags appear alongside them.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
