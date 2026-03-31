import React, { useState, useRef, useEffect } from 'react';
import { SOURCE_COLORS, SOURCES } from './storage';

// ─── Styles ────────────────────────────────────────────────
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sheet: {
    background: '#2A2520',
    borderRadius: '16px 16px 0 0',
    padding: '24px 20px 32px',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '80vh',
    overflowY: 'auto',
    animation: 'slideUp 0.25s ease-out',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '40px 20px 0',
    zIndex: 10,
    pointerEvents: 'none',
  },
  headerContent: {
    maxWidth: '480px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 300,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: '#8A7E75',
  },
  stats: {
    fontSize: '13px',
    color: '#6B6058',
    fontWeight: 300,
  },
  addBtn: {
    pointerEvents: 'auto',
    marginTop: '12px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '1px solid #3D3530',
    background: 'rgba(45,38,33,0.8)',
    color: '#8A7E75',
    fontSize: '22px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    lineHeight: 1,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #3D3530',
    background: '#1A1715',
    color: '#E8E0D8',
    fontSize: '15px',
    outline: 'none',
    marginBottom: '12px',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #3D3530',
    background: '#1A1715',
    color: '#E8E0D8',
    fontSize: '14px',
    outline: 'none',
    resize: 'none',
    height: '64px',
    marginBottom: '12px',
  },
  pillRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '14px',
  },
  pill: (active, color) => ({
    padding: '6px 14px',
    borderRadius: '20px',
    border: `1px solid ${active ? color : '#3D3530'}`,
    background: active ? color + '22' : 'transparent',
    color: active ? color : '#8A7E75',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  submitBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    background: '#D4845A',
    color: '#1A1715',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: '4px',
  },
  label: {
    fontSize: '12px',
    color: '#6B6058',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
    display: 'block',
  },
  sheetTitle: {
    fontSize: '18px',
    fontWeight: 500,
    color: '#E8E0D8',
    marginBottom: '20px',
    textAlign: 'center',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #2D2822',
    fontSize: '14px',
  },
  detailLabel: {
    color: '#6B6058',
  },
  detailValue: {
    color: '#E8E0D8',
  },
  actionBtn: (color = '#8A7E75') => ({
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid #3D3530',
    background: 'transparent',
    color,
    fontSize: '15px',
    cursor: 'pointer',
    marginBottom: '8px',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  }),
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.08)',
    color: '#8A7E75',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

// Inject keyframe animation
if (typeof document !== 'undefined' && !document.getElementById('lt-keyframes')) {
  const style = document.createElement('style');
  style.id = 'lt-keyframes';
  style.textContent = `
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

// ─── Header ────────────────────────────────────────────────
export function Header({ threads, onAdd }) {
  const loose = threads.filter(t => t.status === 'loose').length;
  const knotted = threads.filter(t => t.status === 'knotted').length;
  const bowed = threads.filter(t => t.status === 'bowed').length;

  return (
    <div style={styles.header}>
      <div style={styles.headerContent}>
        <div style={styles.title}>Loose Threads</div>
        <div style={styles.stats}>
          {loose} loose &middot; {knotted} knotted &middot; {bowed} done
        </div>
        <button
          style={styles.addBtn}
          onClick={onAdd}
          onMouseEnter={e => { e.target.style.borderColor = '#D4845A'; e.target.style.color = '#D4845A'; }}
          onMouseLeave={e => { e.target.style.borderColor = '#3D3530'; e.target.style.color = '#8A7E75'; }}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Add Thread Form ───────────────────────────────────────
export function AddThreadForm({ onSubmit, onClose, existingCategories }) {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('manual');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), source, category: category.trim(), notes: notes.trim() });
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.sheet, position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>&times;</button>
        <div style={styles.sheetTitle}>New Thread</div>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Title</label>
          <input
            ref={inputRef}
            style={styles.input}
            placeholder="What's on your mind?"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <label style={styles.label}>Source</label>
          <div style={styles.pillRow}>
            {SOURCES.map(s => (
              <button
                key={s}
                type="button"
                style={styles.pill(source === s, SOURCE_COLORS[s])}
                onClick={() => setSource(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <label style={styles.label}>Category</label>
          <input
            style={styles.input}
            placeholder="e.g., health, work, family"
            value={category}
            onChange={e => setCategory(e.target.value)}
            list="categories"
          />
          <datalist id="categories">
            {existingCategories.map(c => <option key={c} value={c} />)}
          </datalist>

          <label style={styles.label}>Notes (optional)</label>
          <textarea
            style={styles.textarea}
            placeholder="Add context..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <button type="submit" style={styles.submitBtn}>Add Thread</button>
        </form>
      </div>
    </div>
  );
}

// ─── Thread Detail Card ────────────────────────────────────
export function DetailCard({ thread, onClose, onAction }) {
  if (!thread) return null;

  const created = new Date(thread.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.sheet, position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>&times;</button>
        <div style={styles.sheetTitle}>{thread.title}</div>

        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Status</span>
          <span style={styles.detailValue}>{thread.status}</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Source</span>
          <span style={{ ...styles.detailValue, color: thread.color }}>{thread.source}</span>
        </div>
        {thread.category && (
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Category</span>
            <span style={styles.detailValue}>{thread.category}</span>
          </div>
        )}
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Created</span>
          <span style={styles.detailValue}>{created}</span>
        </div>
        {thread.notes && (
          <div style={{ ...styles.detailRow, flexDirection: 'column', gap: '4px', borderBottom: 'none' }}>
            <span style={styles.detailLabel}>Notes</span>
            <span style={{ ...styles.detailValue, fontSize: '14px' }}>{thread.notes}</span>
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          {thread.status !== 'bowed' && (
            <button style={styles.actionBtn('#B8D4A0')} onClick={() => onAction('bow')}>
              <span style={{ fontSize: '18px' }}>&#10003;</span> Tie a Bow — done
            </button>
          )}
          {thread.status !== 'knotted' && thread.status !== 'bowed' && (
            <button style={styles.actionBtn('#C2956B')} onClick={() => onAction('knot')}>
              <span style={{ fontSize: '18px' }}>&#9673;</span> Tie a Knot — progress
            </button>
          )}
          {thread.status !== 'loose' && (
            <button style={styles.actionBtn('#8A7E75')} onClick={() => onAction('loose')}>
              <span style={{ fontSize: '18px' }}>&#8635;</span> Unravel — reopen
            </button>
          )}
          <button style={styles.actionBtn('#E87070')} onClick={() => onAction('delete')}>
            <span style={{ fontSize: '18px' }}>&#10005;</span> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Action Menu (long press) ──────────────────────────────
export function ActionMenu({ thread, position, onAction, onClose }) {
  if (!thread) return null;

  const menuStyle = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 200),
    top: Math.min(position.y, window.innerHeight - 200),
    background: '#2A2520',
    borderRadius: '12px',
    padding: '8px',
    zIndex: 200,
    minWidth: '180px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
    border: '1px solid #3D3530',
  };

  const itemStyle = (color = '#E8E0D8') => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    border: 'none',
    background: 'transparent',
    color,
    fontSize: '14px',
    cursor: 'pointer',
    borderRadius: '8px',
    width: '100%',
    textAlign: 'left',
  });

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={onClose} />
      <div style={menuStyle}>
        {thread.status !== 'bowed' && (
          <button
            style={itemStyle('#B8D4A0')}
            onClick={() => onAction('bow')}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.target.style.background = 'transparent'}
          >
            &#10003; Tie a Bow
          </button>
        )}
        {thread.status === 'loose' && (
          <button
            style={itemStyle('#C2956B')}
            onClick={() => onAction('knot')}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.target.style.background = 'transparent'}
          >
            &#9673; Tie a Knot
          </button>
        )}
        <button
          style={itemStyle()}
          onClick={() => onAction('detail')}
          onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => e.target.style.background = 'transparent'}
        >
          &#9998; Details
        </button>
        <button
          style={itemStyle('#E87070')}
          onClick={() => onAction('delete')}
          onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => e.target.style.background = 'transparent'}
        >
          &#10005; Delete
        </button>
      </div>
    </>
  );
}
