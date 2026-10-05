import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, RotateCw, ZoomIn, ZoomOut, RotateCcw, Check, Crop, Move } from 'lucide-react';
import { useEscapeKey } from '../utils/helpers';

// Viewport dimensions
const VIEWPORT_SIZE = 320;
const CROP_RADIUS = 130; // 260px diameter circle
const CROP_DIAMETER = CROP_RADIUS * 2;
const OUTPUT_SIZE = 400; // 400x400 output image

// Scale that makes the (rotated) image just cover the crop circle, times the zoom
const getScale = (img, rotation, zoom) => {
  const sideways = rotation === 90 || rotation === 270;
  const width = sideways ? img.naturalHeight : img.naturalWidth;
  const height = sideways ? img.naturalWidth : img.naturalHeight;
  return Math.max(CROP_DIAMETER / width, CROP_DIAMETER / height) * zoom;
};

// Circular avatar cropper: drag to pan, zoom, rotate 90°, reset, with live preview.
export default function ImageCropperModal({
  imageSrc,
  onClose,
  onCropComplete,
  title = 'Crop & Reposition Profile Picture',
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  // Load the image and reset the controls whenever a new image is given
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setImageLoaded(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEscapeKey(onClose);

  // Redraw preview canvas whenever zoom, rotation, pan, or image changes
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;

    const totalScale = getScale(img, rotation, zoom);

    // Draw transformed image
    ctx.save();
    ctx.translate(cx + pan.x, cy + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(totalScale, totalScale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // Draw dark semi-transparent mask outside crop circle
    ctx.save();
    ctx.fillStyle = 'rgba(15, 12, 8, 0.62)';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.arc(cx, cy, CROP_RADIUS, 0, Math.PI * 2, true);
    ctx.fill();

    // Draw crop circle border (golden accent)
    ctx.beginPath();
    ctx.arc(cx, cy, CROP_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = '#e6b820';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw rule-of-thirds grid guides inside the circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, CROP_RADIUS, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const step = CROP_DIAMETER / 3;
    const startX = cx - CROP_RADIUS;
    const startY = cy - CROP_RADIUS;

    // Vertical grid lines
    ctx.beginPath();
    ctx.moveTo(startX + step, cy - CROP_RADIUS);
    ctx.lineTo(startX + step, cy + CROP_RADIUS);
    ctx.moveTo(startX + step * 2, cy - CROP_RADIUS);
    ctx.lineTo(startX + step * 2, cy + CROP_RADIUS);

    // Horizontal grid lines
    ctx.moveTo(cx - CROP_RADIUS, startY + step);
    ctx.lineTo(cx + CROP_RADIUS, startY + step);
    ctx.moveTo(cx - CROP_RADIUS, startY + step * 2);
    ctx.lineTo(cx + CROP_RADIUS, startY + step * 2);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }, [zoom, rotation, pan, imageLoaded]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // Drag to pan (shared by mouse and single-finger touch)
  const startDrag = (point) => {
    setIsDragging(true);
    setDragStart({ x: point.clientX - pan.x, y: point.clientY - pan.y });
  };

  const moveDrag = (point) => {
    if (isDragging) setPan({ x: point.clientX - dragStart.x, y: point.clientY - dragStart.y });
  };

  const endDrag = () => setIsDragging(false);

  const handleMouseDown = (e) => startDrag(e);
  const handleMouseMove = (e) => moveDrag(e);
  const handleMouseUp = endDrag;
  const handleTouchStart = (e) => e.touches.length === 1 && startDrag(e.touches[0]);
  const handleTouchMove = (e) => e.touches.length === 1 && moveDrag(e.touches[0]);
  const handleTouchEnd = endDrag;

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Math.min(Math.max(1, prev + delta), 3.5));
  };

  // Rotation handler (clockwise 90 deg)
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset to default zoom, pan, rotation
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Export cropped canvas to high-res base64
  const handleApplyCrop = () => {
    const img = imgRef.current;
    if (!img) return;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = OUTPUT_SIZE;
    outCanvas.height = OUTPUT_SIZE;
    const outCtx = outCanvas.getContext('2d');

    const totalScale = getScale(img, rotation, zoom);
    // Ratio between output resolution and on-screen crop circle
    const scaleRatio = OUTPUT_SIZE / CROP_DIAMETER;

    outCtx.save();
    // Center in output canvas
    outCtx.translate(OUTPUT_SIZE / 2 + pan.x * scaleRatio, OUTPUT_SIZE / 2 + pan.y * scaleRatio);
    outCtx.rotate((rotation * Math.PI) / 180);
    outCtx.scale(totalScale * scaleRatio, totalScale * scaleRatio);
    outCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    outCtx.restore();

    // High quality JPEG
    const croppedDataUrl = outCanvas.toDataURL('image/jpeg', 0.92);
    onCropComplete(croppedDataUrl);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(18, 14, 8, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        padding: '20px',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '22px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {/* Header */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Crop size={17} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Drag to reposition • Scroll or use slider to zoom
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '6px', borderRadius: '50%' }}
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Crop Viewport Canvas */}
        <div
          style={{
            position: 'relative',
            width: `${VIEWPORT_SIZE}px`,
            height: `${VIEWPORT_SIZE}px`,
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            background: '#0d0a06',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            touchAction: 'none',
            boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            width={VIEWPORT_SIZE}
            height={VIEWPORT_SIZE}
            style={{ display: 'block', width: '100%', height: '100%' }}
          />

          {!imageLoaded && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                fontSize: '0.85rem',
              }}
            >
              Loading image...
            </div>
          )}

          {/* Quick Reposition Hint Overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              background: 'rgba(0, 0, 0, 0.6)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.68rem',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: 0.85,
            }}
          >
            <Move size={11} />
            <span>Drag image to center face</span>
          </div>
        </div>

        {/* Zoom & Adjustment Controls */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Zoom Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(1, +(prev - 0.15).toFixed(2)))}
              className="btn-secondary"
              style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }}
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>

            <input
              type="range"
              min="1"
              max="3.5"
              step="0.02"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{
                flex: 1,
                cursor: 'pointer',
                accentColor: 'var(--primary)',
              }}
            />

            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3.5, +(prev + 0.15).toFixed(2)))}
              className="btn-secondary"
              style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }}
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>

            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', minWidth: '38px', textAlign: 'right' }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Secondary Controls: Rotate & Reset */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleRotate}
                className="btn-secondary"
                style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                title="Rotate 90° Clockwise"
              >
                <RotateCw size={13} />
                <span>Rotate 90°</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="btn-secondary"
                style={{ fontSize: '0.78rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Reset zoom and position"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Square output • 400x400</div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            borderTop: '1px solid var(--border-glass)',
            paddingTop: '14px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ fontSize: '0.84rem', padding: '7px 16px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={!imageLoaded}
            className="btn-primary"
            style={{ fontSize: '0.84rem', padding: '7px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Check size={14} />
            <span>Apply Crop</span>
          </button>
        </div>
      </div>
    </div>
  );
}
