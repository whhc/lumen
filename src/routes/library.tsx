import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Layout } from '@/components/Layout';
import { Sidebar } from '@/components/Sidebar';
import { Toolbar } from '@/components/Toolbar';
import { MediaGrid } from '@/components/MediaGrid';
import { useMediaStore } from '@/stores/mediaStore';
import { MediaRecord } from '@/types/models';
import { tauriClient } from '@/api/tauriClient';
import { emitTo, listen } from '@tauri-apps/api/event';
import { REQUEST_PREVIEW_DATA } from '@/constants/request';
import { MEDIA_PREVIEW } from '@/constants/windows';
import { PREVIEW_MEDIA_LIST } from '@/constants/data';
import { open } from '@tauri-apps/plugin-dialog';

export const Route = createFileRoute('/library')({
  component: LibraryRoute,
});

function LibraryRoute() {
  const { photos, isLoading, loadMedia } = useMediaStore();
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('date-desc');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleSelectMedia = (mediaId: string) => {
    setSelectedMedia((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mediaId)) {
        newSet.delete(mediaId);
      } else {
        newSet.add(mediaId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedMedia.size === photos.length) {
      setSelectedMedia(new Set());
    } else {
      setSelectedMedia(new Set(photos.map((p) => p.id)));
    }
  };

  const handlePreviewMedia = async (media: MediaRecord) => {
    // 打开新的预览窗口
    await tauriClient.createPreviewWindow({
      media,
      mediaList: photos,
    });

    listen(REQUEST_PREVIEW_DATA, async () => {
      await emitTo(MEDIA_PREVIEW, PREVIEW_MEDIA_LIST, {
        media,
        mediaList: photos,
      });
    });
  };

  const handleImportFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Images',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          },
        ],
      });
      console.log('导入文件:', selected);
    } catch (error) {
      console.error('导入文件失败:', error);
    }
  };

  const handleImportFolder = async () => {
    try {
      const folder = await open({ directory: true });
      if (folder) {
        const images = await tauriClient.call('read_images_in_dir', {
          dir: folder,
        });
        console.log(images);
      }
    } catch (error) {
      console.error('导入文件夹失败:', error);
    }
  };

  // 详情面板组件
  const DetailPanel =
    selectedMedia.size > 0 ? (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">选中项目详情</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">已选择</p>
            <p className="text-lg">{selectedMedia.size} 个项目</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">总大小</p>
            <p className="text-lg">
              {(
                photos
                  .filter((p) => selectedMedia.has(p.id))
                  .reduce((sum, p) => sum + (p.size || 0), 0) /
                (1024 * 1024)
              ).toFixed(1)}{' '}
              MB
            </p>
          </div>
        </div>
      </div>
    ) : photos.length > 0 ? (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">库信息</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">照片总数</p>
            <p className="text-lg">{photos.length} 张</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">存储使用</p>
            <p className="text-lg">
              {(
                photos.reduce((sum, p) => sum + (p.size || 0), 0) /
                (1024 * 1024 * 1024)
              ).toFixed(1)}{' '}
              GB
            </p>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <Layout sidebar={<Sidebar />} detailPanel={DetailPanel}>
      <div className="flex flex-col h-full">
        {/* 工具栏 */}
        <Toolbar
          selectedCount={selectedMedia.size}
          viewMode={viewMode}
          sortBy={sortBy}
          searchQuery={searchQuery}
          onViewModeChange={setViewMode}
          onSortChange={setSortBy}
          onSearchChange={setSearchQuery}
          onImportFiles={handleImportFiles}
          onImportFolder={handleImportFolder}
          onSelectAll={handleSelectAll}
        />

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p>加载中...</p>
            </div>
          ) : (
            <MediaGrid
              media={photos}
              selectedMedia={selectedMedia}
              onSelectMedia={handleSelectMedia}
              onPreviewMedia={handlePreviewMedia}
            />
          )}
        </div>

        {/* 底部状态栏 */}
        <div className="border-t border-border px-4 py-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>已选择 {selectedMedia.size} 个项目</span>
            <span>总计 {photos.length} 张照片</span>
            <span>
              存储使用{' '}
              {(
                photos.reduce((sum, p) => sum + (p.size || 0), 0) /
                (1024 * 1024 * 1024)
              ).toFixed(1)}{' '}
              GB
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
