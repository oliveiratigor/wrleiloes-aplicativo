import Cropper from "react-easy-crop";
import { useCallback, useState } from "react";
import { RotateCw, Check, X } from "lucide-react";

type Area = { x: number; y: number; width: number; height: number };

interface PhotoEditorProps {
  file: File;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

export function PhotoEditor({ file, onConfirm, onCancel }: PhotoEditorProps) {
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
    URL.revokeObjectURL(imageSrc);
    onConfirm(blob);
  }

  function handleCancel() {
    URL.revokeObjectURL(imageSrc);
    onCancel();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={4 / 3}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid={false}
          style={{
            containerStyle: { background: "#000" },
            cropAreaStyle: { border: "2px solid rgba(255,255,255,0.8)" },
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-4 bg-black/90 px-6 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleCancel}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setRotation((r) => (r + 90) % 360)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white"
        >
          <RotateCw className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        >
          <Check className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number,
): Promise<Blob> {
  const image = await loadImage(imageSrc);

  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const rotW = image.width * cos + image.height * sin;
  const rotH = image.width * sin + image.height * cos;

  const rotCanvas = document.createElement("canvas");
  rotCanvas.width = rotW;
  rotCanvas.height = rotH;
  const rotCtx = rotCanvas.getContext("2d")!;
  rotCtx.translate(rotW / 2, rotH / 2);
  rotCtx.rotate(rad);
  rotCtx.drawImage(image, -image.width / 2, -image.height / 2);

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    rotCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
