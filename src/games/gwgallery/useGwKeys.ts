import { useEffect, useRef } from 'react';

export function useGwKeys(handle: (key: string) => boolean) {
  const handleRef = useRef(handle);
  handleRef.current = handle;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat && event.key.toLowerCase() === 'p') return;
      const target = event.target as HTMLElement | null;
      if (event.altKey || event.ctrlKey || event.metaKey || target?.isContentEditable
        || target?.closest('input, textarea, select')) return;
      // Space/Enter retain their native meaning on focused buttons.
      if ((event.key === ' ' || event.key === 'Enter') && target?.closest('button')) return;
      if (handleRef.current(event.key.toLowerCase())) event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
