import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ZoomIn, ZoomOut, RotateCcw, Move, Loader2 } from 'lucide-react';

export interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  onConfirmCrop: (croppedBase64: string) => Promise<void> | void;
  isSaving?: boolean;
}

const VIEWPORT_SIZE = 280; // Size of the crop square in pixels
const OUTPUT_SIZE = 512;   // High-res output size

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onConfirmCrop,
  isSaving = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initPosX: number; initPosY: number }>({
    startX: 0,
    startY: 0,
    initPosX: 0,
    initPosY: 0,
  });

  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalDim, setNaturalDim] = useState({ width: 0, height: 0 });

  // Reset state when new image opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setImgLoaded(false);
    }
  }, [isOpen, imageSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalDim({ width: img.naturalWidth, height: img.naturalHeight });
    setImgLoaded(true);
    setPosition({ x: 0, y: 0 });
    setZoom(1);
  };

  // Base cover scale so image fills the 280x280 viewport at zoom=1
  const baseScale = naturalDim.width && naturalDim.height
    ? Math.max(VIEWPORT_SIZE / naturalDim.width, VIEWPORT_SIZE / naturalDim.height)
    : 1;

  const displayedWidth = naturalDim.width * baseScale * zoom;
  const displayedHeight = naturalDim.height * baseScale * zoom;

  // Dragging handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!imgLoaded || isSaving) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: position.x,
      initPosY: position.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    // Allow slight leeway beyond viewport bounds for centering freedom
    const maxOffsetSlack = VIEWPORT_SIZE * 0.45;
    const maxOffsetX = Math.max(0, (displayedWidth - VIEWPORT_SIZE) / 2) + maxOffsetSlack;
    const maxOffsetY = Math.max(0, (displayedHeight - VIEWPORT_SIZE) / 2) + maxOffsetSlack;

    const newX = Math.max(-maxOffsetX, Math.min(maxOffsetX, dragStartRef.current.initPosX + dx));
    const newY = Math.max(-maxOffsetY, Math.min(maxOffsetY, dragStartRef.current.initPosY + dy));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture fallback
      }
      setIsDragging(false);
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomStep = 0.08;
    const newZoom = e.deltaY < 0 ? zoom + zoomStep : zoom - zoomStep;
    setZoom(Math.max(1, Math.min(3, parseFloat(newZoom.toFixed(2)))));
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Canvas Crop & Export
  const handleSaveCrop = useCallback(async () => {
    if (!imageRef.current || !imgLoaded || isSaving) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Enable high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const multiplier = OUTPUT_SIZE / VIEWPORT_SIZE;

    // Center coordinates in preview space
    const previewCenterX = VIEWPORT_SIZE / 2 + position.x;
    const previewCenterY = VIEWPORT_SIZE / 2 + position.y;

    // Top-left corner of displayed image in preview space
    const topLeftX = previewCenterX - displayedWidth / 2;
    const topLeftY = previewCenterY - displayedHeight / 2;

    // Draw image onto high-res canvas
    ctx.drawImage(
      imageRef.current,
      topLeftX * multiplier,
      topLeftY * multiplier,
      displayedWidth * multiplier,
      displayedHeight * multiplier
    );

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.92);
    await onConfirmCrop(croppedBase64);
  }, [imgLoaded, isSaving, position.x, position.y, displayedWidth, displayedHeight, onConfirmCrop]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => {} : onClose}
      title="Adjust Profile Photo"
      description="Drag to center face and adjust zoom for circular avatar."
      maxWidth="md"
    >
      <div className="space-y-5 pt-2">
        {/* Interactive Crop Viewport */}
        <div className="flex flex-col items-center justify-center">
          <div
            className={`relative overflow-hidden rounded-2xl bg-slate-900 border-2 border-slate-200 select-none touch-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            {/* The Image being positioned */}
            {imageSrc && (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Source preview"
                onLoad={handleImageLoad}
                draggable={false}
                className="absolute origin-center transition-none pointer-events-none select-none max-w-none"
                style={{
                  width: displayedWidth || 'auto',
                  height: displayedHeight || 'auto',
                  transform: `translate(${VIEWPORT_SIZE / 2 + position.x - displayedWidth / 2}px, ${
                    VIEWPORT_SIZE / 2 + position.y - displayedHeight / 2
                  }px)`,
                }}
              />
            )}

            {/* Circular Mask Overlay */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)',
                borderRadius: '50%',
              }}
            />

            {/* Circular Guide Ring */}
            <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/80 shadow-[0_0_15px_rgba(0,0,0,0.3)]" />

            {/* Subtle Crosshair Center Marker */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
              <div className="h-6 w-0.5 bg-white" />
              <div className="w-6 h-0.5 bg-white absolute" />
            </div>

            {/* Drag hint overlay badge */}
            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-md text-white text-[11px] font-bold tracking-wide">
              <Move className="h-3 w-3" />
              <span>Drag to center</span>
            </div>
          </div>
        </div>

        {/* Controls: Zoom Slider + Reset (Unboxed) */}
        <div className="space-y-2 px-1">
          <div className="flex items-center justify-between text-xs font-bold text-[#756883]">
            <span>Zoom</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(1, parseFloat((prev - 0.15).toFixed(2))))}
              disabled={zoom <= 1 || isSaving}
              aria-label="Zoom out"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-[#756883] hover:text-[#24133F] transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              disabled={isSaving}
              className="flex-1 accent-[#7C27BD] cursor-pointer h-2 bg-slate-200 rounded-lg"
            />

            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3, parseFloat((prev + 0.15).toFixed(2))))}
              disabled={zoom >= 3 || isSaving}
              aria-label="Zoom in"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-[#756883] hover:text-[#24133F] transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving || (zoom === 1 && position.x === 0 && position.y === 0)}
              title="Reset Zoom & Centering"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-purple-50 text-xs font-bold text-[#756883] hover:text-[#7C27BD] transition-all active:scale-95 disabled:opacity-30 cursor-pointer shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => void handleSaveCrop()}
            disabled={!imgLoaded || isSaving}
          >
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Photo…
              </span>
            ) : (
              'Apply & Save'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
