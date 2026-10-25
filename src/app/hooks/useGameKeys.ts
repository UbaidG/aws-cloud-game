import { useEffect, useRef } from 'react';
import { useGame } from '../store/GameProvider';

const INTERACTIVE = /^(BUTTON|A|INPUT|SELECT|TEXTAREA|SUMMARY)$/;

/**
 * Global shortcuts. Escape always unwinds one layer. Game keys never fire while typing, while a
 * dialog is open, or (for Space) while a button has focus, where Space must press that button.
 */
export function useGameKeys(): void {
  const { state, dispatch } = useGame();
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat) return;
      const s = latest.current;
      const target = e.target as HTMLElement | null;
      const typing = !!target && (/^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName) || target.isContentEditable);

      if (e.key === 'Escape') {
        if (typing) (target as HTMLElement).blur();
        dispatch({ type: 'escape' });
        return;
      }
      if (typing || s.overlay || e.metaKey || e.ctrlKey || e.altKey || s.screen !== 'play') return;

      if (e.code === 'Space') {
        if (target && target !== document.body && INTERACTIVE.test(target.tagName)) return;
        e.preventDefault();
        dispatch({ type: 'runStart' });
        return;
      }
      switch (e.key.toLowerCase()) {
        case 'v':
          dispatch({ type: 'setTool', tool: 'select' });
          break;
        case 'c':
          dispatch({ type: 'setTool', tool: 'wire' });
          break;
        case 'x':
          dispatch({ type: 'setTool', tool: 'delete' });
          break;
        case 'delete':
        case 'backspace':
          if (s.selectedId) dispatch({ type: 'remove', id: s.selectedId });
          else if (s.selectedWireId) dispatch({ type: 'disconnect', wireId: s.selectedWireId });
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);
}
