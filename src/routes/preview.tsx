import { useState, useEffect, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { MediaRecord } from '@/types/models';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Star,
  Edit3,
  Info,
} from 'lucide-react';
import { PREVIEW_MEDIA_LIST } from '@/constants/data';
import { useTauriEvent } from '@/hooks/use-tauri-event';
import { emit } from '@tauri-apps/api/event';
import { REQUEST_PREVIEW_DATA } from '@/constants/request';

export const Route = createFileRoute('/preview')({
  component: MediaPreviewWindow,
});

function MediaPreviewWindow() {
  const [media, setMedia] = useState<MediaRecord | null>(null);
  const [mediaList, setMediaList] = useState<MediaRecord[]>([]);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const currentWindow = getCurrentWebviewWindow();

  useEffect(() => {
    emit(REQUEST_PREVIEW_DATA);
  }, []);

  useTauriEvent(PREVIEW_MEDIA_LIST, (event) => {
    const { media: previewMedia, mediaList: list } = event.payload as any;
    setMedia(previewMedia);
    setMediaList(list);
  });

  useEffect(() => {
    if (media) {
      // 重置预览状态
      setZoom(1);
      setRotation(0);
      setIsFavorite(false);
    }
  }, [media]);

  const currentIndex = mediaList.findIndex((m) => m.id === media?.id);
  const hasNext = currentIndex < mediaList.length - 1 && currentIndex !== -1;
  const hasPrev = currentIndex > 0;

  const handleNext = useCallback(() => {
    if (hasNext) {
      setMedia(mediaList[currentIndex + 1]);
    }
  }, [hasNext, mediaList, currentIndex]);

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      setMedia(mediaList[currentIndex - 1]);
    }
  }, [hasPrev, mediaList, currentIndex]);

  const handleZoomIn = useCallback(
    () => setZoom((prev) => Math.min(prev + 0.25, 3)),
    []
  );
  const handleZoomOut = useCallback(
    () => setZoom((prev) => Math.max(prev - 0.25, 0.5)),
    []
  );
  const handleRotate = useCallback(
    () => setRotation((prev) => (prev + 90) % 360),
    []
  );
  const handleReset = useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);

  const handleClose = useCallback(async () => {
    currentWindow.close();
  }, [currentWindow]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleClose();
          break;
        case 'ArrowLeft':
          if (hasPrev) handlePrev();
          break;
        case 'ArrowRight':
          if (hasNext) handleNext();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
          handleRotate();
          break;
        case '0':
          handleReset();
          break;
        case 'F11':
          e.preventDefault();
          currentWindow.setFullscreen(true);
          break;
      }
    },
    [
      hasPrev,
      hasNext,
      handleClose,
      handlePrev,
      handleNext,
      handleZoomIn,
      handleZoomOut,
      handleRotate,
      handleReset,
      currentWindow,
    ]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!media) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black flex overflow-hidden">
      {/* 主预览区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold truncate max-w-md text-white">
              {media.name}
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFavorite(!isFavorite)}
              className="text-white hover:bg-white/20"
            >
              <Star
                className={cn(
                  'w-4 h-4',
                  isFavorite && 'fill-yellow-400 text-yellow-400'
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowInfo(!showInfo)}
              className="text-white hover:bg-white/20"
            >
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 图片显示区域 */}
        <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
          <div className="flex items-center justify-center w-full h-full">
            {media.kind === 'video' ? (
              <div className="relative flex items-center justify-center">
                <video
                  src={media.path}
                  controls
                  className="max-h-full max-w-full object-contain"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                />
              </div>
            ) : (
              <img
                src={media.path}
                alt={media.name}
                className={cn(
                  'max-h-full max-w-full object-contain transition-transform duration-200'
                )}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
              />
            )}
          </div>

          {/* 导航按钮 */}
          {hasPrev && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
              onClick={handlePrev}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}

          {hasNext && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
              onClick={handleNext}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          )}
        </div>

        {/* 底部控制栏 */}
        <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/70">
              {currentIndex + 1} / {mediaList.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="text-white hover:bg-white/20"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm w-12 text-center text-white">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="text-white hover:bg-white/20"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleRotate}
              className="text-white hover:bg-white/20"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-white hover:bg-white/20"
            >
              重置
            </Button>
          </div>
        </div>
      </div>

      {/* 信息面板 */}
      {showInfo && (
        <div className="w-80 bg-black/80 backdrop-blur-sm border-l border-white/20">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6 text-white">
              <div>
                <h3 className="font-semibold mb-2">基本信息</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">文件名</span>
                    <span>{media.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">类型</span>
                    <span>{media.kind}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">大小</span>
                    <span>
                      {((media.size || 0) / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  {media.takenDate && (
                    <div className="flex justify-between">
                      <span className="text-white/70">拍摄时间</span>
                      <span>{new Date(media.takenDate).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {media.width && media.height && (
                <div>
                  <h3 className="font-semibold mb-2">图像信息</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">尺寸</span>
                      <span>
                        {media.width} × {media.height}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">分辨率</span>
                      <span>
                        {((media.width * media.height) / 1000000).toFixed(1)} MP
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {media.tags && media.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">标签</h3>
                  <div className="flex flex-wrap gap-1">
                    {media.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-white/20 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
