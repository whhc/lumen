import { useState } from 'react';
import { MediaRecord } from '@/types/models';
import { cn } from '@/lib/utils';

import { Checkbox } from '@/components/ui/checkbox';
import { Image, Play } from 'lucide-react';

interface MediaGridProps {
  media: MediaRecord[];
  selectedMedia: Set<string>;
  onSelectMedia: (mediaId: string) => void;
  onPreviewMedia: (media: MediaRecord) => void;
  className?: string;
}

export function MediaGrid({
  media,
  selectedMedia,
  onSelectMedia,
  onPreviewMedia,
  className,
}: MediaGridProps) {
  const [hoveredMedia, setHoveredMedia] = useState<string | null>(null);

  return (
    <div className={cn('p-4', className)}>
      <div className="grid grid-cols-5 gap-4">
        {media.map((item) => (
          <div
            key={item.id}
            className={cn(
              'group relative aspect-square rounded-lg border border-border bg-card overflow-hidden cursor-pointer transition-all duration-200',
              selectedMedia.has(item.id)
                ? 'ring-2 ring-primary shadow-md'
                : 'hover:shadow-md hover:scale-105'
            )}
            onMouseEnter={() => setHoveredMedia(item.id)}
            onMouseLeave={() => setHoveredMedia(null)}
            onClick={() => onPreviewMedia(item)}
          >
            {/* 缩略图 */}
            <div className="w-full h-full flex items-center justify-center bg-muted">
              {item.kind === 'video' ? (
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white/80" />
                  </div>
                  <img
                    src={item.thumbnailPath || '/placeholder-image.jpg'}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <img
                  src={item.thumbnailPath || '/placeholder-image.jpg'}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* 选择复选框 */}
            <div
              className={cn(
                'absolute top-2 left-2 transition-opacity duration-200',
                hoveredMedia === item.id || selectedMedia.has(item.id)
                  ? 'opacity-100'
                  : 'opacity-0'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={selectedMedia.has(item.id)}
                onCheckedChange={() => onSelectMedia(item.id)}
                className="h-4 w-4 bg-background"
              />
            </div>

            {/* 媒体类型标识 */}
            <div className="absolute top-2 right-2">
              {item.kind === 'video' && (
                <div className="bg-black/50 rounded px-1 py-0.5">
                  <Play className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            {/* 底部信息栏 */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p className="text-white text-xs truncate">{item.name}</p>
              {item.takenDate && (
                <p className="text-white/70 text-xs">
                  {new Date(item.takenDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {media.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Image className="w-16 h-16 mb-4" />
          <p className="text-lg">暂无照片</p>
          <p className="text-sm">导入照片开始管理您的回忆</p>
        </div>
      )}
    </div>
  );
}
