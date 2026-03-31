import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createThreadPoints, createConstraints, simulateThread, findNearestPoint, applyWobble } from './physics';
import { drawThread, drawThreadLabel, drawScrollFade } from './renderer';
import { loadData, saveData, buildSeedData, createThread, SOURCE_COLORS } from './storage';
import { Header, AddThreadForm, DetailCard, ActionMenu } from './components';

const THREAD_WIDTH = 70;
const THREAD_GAP = 20;
const THREAD_ZONE_RATIO = 0.38; // threads occupy bottom 38%

export default function App() {
  const [threads, setThreads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [detailThread, setDetailThread] = useState(null);
  const [actionMenu, setActionMenu] = useState(null); // { thread, position }

  // Physics state refs (not in React state for perf)
  const physicsRef = useRef({}); // { [threadId]: { points, constraints, phase, freq } }
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const scrollRef = useRef(0);
  const scrollVelRef = useRef(0);
  const lastScrollRef = useRef(0);
  const scrollContainerRef = useRef(null);
  const hoveredRef = useRef(null);
  const dragRef = useRef(null);
  const longPressRef = useRef(null);
  const tapRef = useRef(null);
  const threadsRef = useRef(threads);

  // Keep threadsRef in sync
  useEffect(() => { threadsRef.current = threads; }, [threads]);

  // ─── Load data ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      let data = await loadData();
      if (!data || !data.threads || data.threads.length === 0) {
        data = buildSeedData();
        await saveData(data);
      }
      setThreads(data.threads);
      setCategories(data.categories || []);
      setLoaded(true);
    })();
  }, []);

  // ─── Save on change ────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    saveData({ threads, categories, lastUpdated: new Date().toISOString() });
  }, [threads, categories, loaded]);

  // ─── Initialize / update physics when threads change ───
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const h = canvas.height;
    const threadZoneTop = h * (1 - THREAD_ZONE_RATIO);
    const threadHeight = h * THREAD_ZONE_RATIO * (0.85 + Math.random() * 0.1);

    const visibleThreads = threads.filter(t => t.status !== 'bowed');
    const bowedThreads = threads.filter(t => t.status === 'bowed');
    const allOrdered = [...visibleThreads, ...bowedThreads];

    const physics = physicsRef.current;
    const existing = new Set(Object.keys(physics));

    allOrdered.forEach((thread, i) => {
      if (!physics[thread.id]) {
        const anchorX = i * (THREAD_WIDTH + THREAD_GAP) + THREAD_WIDTH / 2 + 30;
        const heightVar = threadHeight * (0.9 + Math.random() * 0.2);
        const points = createThreadPoints(anchorX, h, heightVar);
        physics[thread.id] = {
          points,
          constraints: createConstraints(points),
          phase: Math.random() * Math.PI * 2,
          freq: 0.008 + Math.random() * 0.006,
          anchorIndex: i,
        };
      } else {
        // Update anchor position if order changed
        physics[thread.id].anchorIndex = i;
        const targetX = i * (THREAD_WIDTH + THREAD_GAP) + THREAD_WIDTH / 2 + 30;
        physics[thread.id].points[0].x = targetX;
      }
      existing.delete(thread.id);
    });

    // Remove physics for deleted threads
    for (const id of existing) {
      delete physics[id];
    }
  }, [threads]);

  // ─── Canvas sizing ─────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ─── Animation loop ────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const animate = () => {
      const ctx = canvas.getContext('2d');
      const w = window.innerWidth;
      const h = window.innerHeight;
      const threadZoneTop = h * (1 - THREAD_ZONE_RATIO);

      ctx.clearRect(0, 0, w, h);
      timeRef.current += 1;

      // Compute scroll velocity
      const currentScroll = scrollRef.current;
      scrollVelRef.current = currentScroll - lastScrollRef.current;
      lastScrollRef.current = currentScroll;

      // Simulate and draw each thread
      const currentThreads = threadsRef.current;
      const visibleThreads = currentThreads.filter(t => t.status !== 'bowed');
      const bowedThreads = currentThreads.filter(t => t.status === 'bowed');
      const allOrdered = [...visibleThreads, ...bowedThreads];

      for (const thread of allOrdered) {
        const phys = physicsRef.current[thread.id];
        if (!phys) continue;

        // Adjust anchor for scroll
        const baseX = phys.anchorIndex * (THREAD_WIDTH + THREAD_GAP) + THREAD_WIDTH / 2 + 30 - scrollRef.current;
        phys.points[0].x = baseX;

        // Check if visible on screen
        if (baseX < -100 || baseX > w + 100) continue;

        const dragPoint = dragRef.current?.threadId === thread.id ? dragRef.current : null;
        simulateThread(phys.points, phys.constraints, timeRef.current, phys.phase, phys.freq, scrollVelRef.current, dragPoint);

        const opacity = thread.status === 'bowed' ? 0.3 : 1;
        drawThread(ctx, phys.points, thread.color, thread.thickness, thread.status, opacity);

        const isHovered = hoveredRef.current === thread.id;
        drawThreadLabel(ctx, phys.points, thread.title, isHovered);
      }

      drawScrollFade(ctx, w, h, threadZoneTop);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // ─── Scroll handling ───────────────────────────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      scrollRef.current = container.scrollLeft;
    };

    // Mouse wheel horizontal scroll
    const handleWheel = (e) => {
      e.preventDefault();
      container.scrollLeft += e.deltaX || e.deltaY;
      scrollRef.current = container.scrollLeft;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // ─── Find thread at position ───────────────────────────
  const findThreadAt = useCallback((clientX, clientY) => {
    const currentThreads = threadsRef.current;
    const allOrdered = [...currentThreads.filter(t => t.status !== 'bowed'), ...currentThreads.filter(t => t.status === 'bowed')];
    let bestThread = null;
    let bestPoint = -1;
    let bestDist = 40;

    for (const thread of allOrdered) {
      const phys = physicsRef.current[thread.id];
      if (!phys) continue;
      const idx = findNearestPoint(phys.points, clientX, clientY, bestDist);
      if (idx >= 0) {
        const p = phys.points[idx];
        const d = Math.sqrt((p.x - clientX) ** 2 + (p.y - clientY) ** 2);
        if (d < bestDist) {
          bestDist = d;
          bestThread = thread;
          bestPoint = idx;
        }
      }
    }
    return { thread: bestThread, pointIndex: bestPoint };
  }, []);

  // ─── Pointer handlers ─────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    const x = e.clientX;
    const y = e.clientY;
    const { thread, pointIndex } = findThreadAt(x, y);

    if (thread) {
      // Start drag
      dragRef.current = { threadId: thread.id, pointIndex, x, y, startX: x, startY: y, startTime: Date.now() };

      // Start long press timer
      longPressRef.current = setTimeout(() => {
        setActionMenu({ thread, position: { x, y } });
        dragRef.current = null;
      }, 500);

      // Wobble neighbors
      const currentThreads = threadsRef.current;
      const allOrdered = [...currentThreads.filter(t => t.status !== 'bowed'), ...currentThreads.filter(t => t.status === 'bowed')];
      const idx = allOrdered.findIndex(t => t.id === thread.id);
      for (const offset of [-1, 1]) {
        const neighbor = allOrdered[idx + offset];
        if (neighbor && physicsRef.current[neighbor.id]) {
          applyWobble(physicsRef.current[neighbor.id].points, 1.5);
        }
      }
    }
  }, [findThreadAt]);

  const handlePointerMove = useCallback((e) => {
    const x = e.clientX;
    const y = e.clientY;

    // Update hover
    const { thread } = findThreadAt(x, y);
    hoveredRef.current = thread ? thread.id : null;

    if (dragRef.current) {
      dragRef.current.x = x;
      dragRef.current.y = y;

      // Cancel long press if moved too far
      const dx = x - dragRef.current.startX;
      const dy = y - dragRef.current.startY;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        clearTimeout(longPressRef.current);
        longPressRef.current = null;
      }
    }
  }, [findThreadAt]);

  const handlePointerUp = useCallback((e) => {
    clearTimeout(longPressRef.current);
    longPressRef.current = null;

    if (dragRef.current) {
      const drag = dragRef.current;
      const elapsed = Date.now() - drag.startTime;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const thread = threadsRef.current.find(t => t.id === drag.threadId);
      dragRef.current = null;

      if (!thread) return;

      // Detect gestures
      if (dist < 10 && elapsed < 300) {
        // Tap — check for double tap
        if (tapRef.current && tapRef.current.threadId === thread.id && Date.now() - tapRef.current.time < 400) {
          // Double tap → tie a bow
          tapRef.current = null;
          handleThreadAction(thread, 'bow');
        } else {
          tapRef.current = { threadId: thread.id, time: Date.now() };
          // Single tap after delay
          setTimeout(() => {
            if (tapRef.current && tapRef.current.threadId === thread.id) {
              setDetailThread(thread);
              tapRef.current = null;
            }
          }, 400);
        }
      } else if (dy < -50 && Math.abs(dx) < 40 && elapsed < 500) {
        // Swipe up → tie a knot
        handleThreadAction(thread, 'knot');
      }
    }
  }, []);

  // ─── Thread actions ────────────────────────────────────
  const handleThreadAction = useCallback((thread, action) => {
    setActionMenu(null);
    setDetailThread(null);

    setThreads(prev => {
      if (action === 'delete') {
        return prev.filter(t => t.id !== thread.id);
      }
      return prev.map(t => {
        if (t.id !== thread.id) return t;
        const now = new Date().toISOString();
        switch (action) {
          case 'bow':
            return { ...t, status: 'bowed', updatedAt: now };
          case 'knot':
            return { ...t, status: 'knotted', updatedAt: now };
          case 'loose':
            return { ...t, status: 'loose', updatedAt: now };
          default:
            return t;
        }
      });
    });
  }, []);

  // ─── Add thread ────────────────────────────────────────
  const handleAddThread = useCallback((data) => {
    const newThread = createThread(data);
    setThreads(prev => [...prev, newThread]);
    if (data.category && !categories.includes(data.category)) {
      setCategories(prev => [...prev, data.category]);
    }
    setShowAddForm(false);
  }, [categories]);

  // ─── Scroll content width ─────────────────────────────
  const totalWidth = (threads.length) * (THREAD_WIDTH + THREAD_GAP) + 60;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#1A1715' }}>
      {/* Canvas for thread physics rendering */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Invisible scroll container for horizontal scrolling */}
      <div
        ref={scrollContainerRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${THREAD_ZONE_RATIO * 100}%`,
          overflowX: 'auto',
          overflowY: 'hidden',
          zIndex: 2,
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div style={{ width: totalWidth, height: '100%' }} />
      </div>

      {/* Pointer event capture layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => { hoveredRef.current = null; dragRef.current = null; }}
      />

      {/* React DOM overlay */}
      <div style={{ position: 'relative', zIndex: 10, pointerEvents: 'none' }}>
        <Header threads={threads} onAdd={() => setShowAddForm(true)} />
      </div>

      {/* Modals */}
      {showAddForm && (
        <AddThreadForm
          onSubmit={handleAddThread}
          onClose={() => setShowAddForm(false)}
          existingCategories={categories}
        />
      )}

      {detailThread && (
        <DetailCard
          thread={detailThread}
          onClose={() => setDetailThread(null)}
          onAction={(action) => {
            if (action === 'detail') return;
            handleThreadAction(detailThread, action);
          }}
        />
      )}

      {actionMenu && (
        <ActionMenu
          thread={actionMenu.thread}
          position={actionMenu.position}
          onAction={(action) => {
            if (action === 'detail') {
              setActionMenu(null);
              setDetailThread(actionMenu.thread);
            } else {
              handleThreadAction(actionMenu.thread, action);
            }
          }}
          onClose={() => setActionMenu(null)}
        />
      )}
    </div>
  );
}
