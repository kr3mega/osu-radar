import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BeatmapAnalysisResult } from '../../engine/types';
import { LazerCarouselItem } from './LazerCarouselItem';

interface VirtualBeatmapListProps {
  maps: BeatmapAnalysisResult[];
  selectedMapId: string | null;
  maxHeightPx?: number;
  onSelectMap: (id: string) => void;
  onRemoveMap: (id: string) => void;
  emptyState: React.ReactNode;
}

const ITEM_HEIGHT = 100;
const ITEM_GAP = 10;
const ROW_STRIDE = ITEM_HEIGHT + ITEM_GAP;
const OVERSCAN = 8;
const VIRTUALIZATION_THRESHOLD = 45;
const ABOVE_THE_FOLD_COUNT = 8;

/**
 * High-performance beatmap list supporting 20,000+ local Songs beatmaps at 60–144 FPS.
 * Combines windowed virtualization for huge collections, `content-visibility: auto` on strictly
 * below-the-fold cards, and full keyboard accessibility (ArrowUp/ArrowDown/Home/End).
 */
export const VirtualBeatmapList: React.FC<VirtualBeatmapListProps> = ({
  maps,
  selectedMapId,
  maxHeightPx,
  onSelectMap,
  onRemoveMap,
  emptyState,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(640);

  const isVirtualized = maps.length > VIRTUALIZATION_THRESHOLD;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      if (el.clientHeight > 0) {
        setViewportHeight(el.clientHeight);
      }
    };
    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateSize);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [maxHeightPx]);

  // Reset scroll to top when filtered list shrinks past current scroll offset
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, maps.length * ROW_STRIDE - viewportHeight);
    if (el.scrollTop > maxScroll) {
      el.scrollTop = 0;
      setScrollTop(0);
    }
  }, [maps.length, viewportHeight]);

  const scrollToIndex = useCallback(
    (targetIdx: number) => {
      const el = containerRef.current;
      if (!el || targetIdx < 0 || targetIdx >= maps.length) return;
      const itemTop = targetIdx * ROW_STRIDE;
      const itemBottom = itemTop + ITEM_HEIGHT;
      const viewTop = el.scrollTop;
      const viewBottom = viewTop + el.clientHeight;

      if (itemTop < viewTop) {
        el.scrollTop = itemTop;
      } else if (itemBottom > viewBottom) {
        el.scrollTop = Math.max(0, itemBottom - el.clientHeight + 24);
      }
    },
    [maps.length]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (maps.length === 0) return;
    const currentIdx = maps.findIndex((m) => m.id === selectedMapId);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = Math.min(maps.length - 1, currentIdx + 1);
      onSelectMap(maps[nextIdx].id);
      scrollToIndex(nextIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = Math.max(0, currentIdx <= 0 ? 0 : currentIdx - 1);
      onSelectMap(maps[prevIdx].id);
      scrollToIndex(prevIdx);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onSelectMap(maps[0].id);
      scrollToIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      const lastIdx = maps.length - 1;
      onSelectMap(maps[lastIdx].id);
      scrollToIndex(lastIdx);
    }
  };

  const containerStyle: React.CSSProperties = {
    height: maxHeightPx && maxHeightPx > 0 ? `${Math.max(460, maxHeightPx)}px` : undefined,
    maxHeight: maxHeightPx && maxHeightPx > 0 ? `${Math.max(460, maxHeightPx)}px` : undefined,
  };

  if (maps.length === 0) {
    return (
      <div ref={containerRef} style={containerStyle} className="osu-radar-beatmapsets-list">
        {emptyState}
      </div>
    );
  }

  if (!isVirtualized) {
    return (
      <div
        ref={containerRef}
        role="listbox"
        aria-label="Lista de beatmaps"
        onKeyDown={handleKeyDown}
        style={containerStyle}
        className="osu-radar-beatmapsets-list"
      >
        {maps.map((map, idx) => (
          <LazerCarouselItem
            key={map.id}
            map={map}
            isSelected={map.id === selectedMapId}
            onSelect={() => onSelectMap(map.id)}
            onRemove={() => onRemoveMap(map.id)}
            deferred={idx >= ABOVE_THE_FOLD_COUNT}
          />
        ))}
      </div>
    );
  }

  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_STRIDE) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_STRIDE) + OVERSCAN * 2;
  const endIdx = Math.min(maps.length, startIdx + visibleCount);
  const topSpacerHeight = startIdx * ROW_STRIDE;
  const bottomSpacerHeight = Math.max(0, (maps.length - endIdx) * ROW_STRIDE - ITEM_GAP);
  const visibleMaps = maps.slice(startIdx, endIdx);

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label={`Lista de ${maps.length} beatmaps`}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      onKeyDown={handleKeyDown}
      style={containerStyle}
      className="osu-radar-beatmapsets-list"
    >
      {topSpacerHeight > 0 && (
        <div
          aria-hidden="true"
          style={{ height: `${topSpacerHeight - ITEM_GAP}px`, flexShrink: 0 }}
        />
      )}
      {visibleMaps.map((map, localIdx) => {
        const absoluteIdx = startIdx + localIdx;
        return (
          <LazerCarouselItem
            key={map.id}
            map={map}
            isSelected={map.id === selectedMapId}
            onSelect={() => onSelectMap(map.id)}
            onRemove={() => onRemoveMap(map.id)}
            deferred={absoluteIdx >= ABOVE_THE_FOLD_COUNT}
          />
        );
      })}
      {bottomSpacerHeight > 0 && (
        <div aria-hidden="true" style={{ height: `${bottomSpacerHeight}px`, flexShrink: 0 }} />
      )}
    </div>
  );
};
