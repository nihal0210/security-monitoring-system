import React, { useState, useEffect } from 'react';
import { parseIsoDate, formatLocalTime, formatLocalDateTime } from '../utils/dateUtils';

export default function HistoricalSlider({
  minTime,
  maxTime,
  currentTime,
  isLive,
  onScrub,
  onReturnToLive
}) {
  const minDate = parseIsoDate(minTime);
  const maxDate = parseIsoDate(maxTime);
  const currentDate = parseIsoDate(currentTime);

  const minMs = minDate ? minDate.getTime() : Date.now() - 3600000;
  const maxMs = maxDate ? maxDate.getTime() : Date.now();
  const currentMs = currentDate ? currentDate.getTime() : maxMs;

  const [sliderValue, setSliderValue] = useState(currentMs);

  useEffect(() => {
    if (isLive) {
      setSliderValue(maxMs);
    } else {
      setSliderValue(currentMs);
    }
  }, [isLive, maxMs, currentMs]);

  const handleChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setSliderValue(val);
  };

  const handleCommit = (e) => {
    const val = parseInt(e.target.value, 10);
    const scrubDate = new Date(val);
    onScrub(scrubDate);
  };

  const handleStepBack = () => {
    const stepMs = 60 * 1000; // 1 minute back
    const target = Math.max(minMs, sliderValue - stepMs);
    setSliderValue(target);
    onScrub(new Date(target));
  };

  const handleStepForward = () => {
    const stepMs = 60 * 1000; // 1 minute forward
    const target = Math.min(maxMs, sliderValue + stepMs);
    setSliderValue(target);
    if (target >= maxMs) {
      onReturnToLive();
    } else {
      onScrub(new Date(target));
    }
  };

  return (
    <div className="scrubber-panel">
      <div className="scrubber-header">
        <div className="scrubber-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>Historical State Time Scrubber</span>
          {!isLive && (
            <span style={{ color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: 4, fontSize: '0.72rem', marginLeft: '8px', fontWeight: 600 }}>
              RECONSTRUCTED AT {formatLocalTime(sliderValue)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="control-btn" onClick={handleStepBack} title="Step 1 minute backward">
            ◀ −1m
          </button>
          <button className="control-btn" onClick={handleStepForward} title="Step 1 minute forward">
            +1m ▶
          </button>
          {!isLive && (
            <button className="btn-live-return" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={onReturnToLive}>
              Return to LIVE
            </button>
          )}
        </div>
      </div>

      <div className="scrubber-slider-container">
        <input
          type="range"
          className="timeline-slider"
          min={minMs}
          max={maxMs}
          value={sliderValue}
          onChange={handleChange}
          onMouseUp={handleCommit}
          onTouchEnd={handleCommit}
        />
      </div>

      <div className="slider-labels">
        <span>Earliest Logged: {formatLocalTime(minMs)}</span>
        <span style={{ color: isLive ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
          {isLive ? '● LIVE (Present)' : `Historical: ${formatLocalDateTime(sliderValue)}`}
        </span>
        <span>Current Live: {formatLocalTime(maxMs)}</span>
      </div>
    </div>
  );
}
