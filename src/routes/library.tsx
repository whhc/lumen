import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Layout } from '@/components/Layout';
import { Sidebar } from '@/components/Sidebar';
import { Toolbar } from '@/components/Toolbar';
import { MediaGrid } from '@/components/MediaGrid';
import { ImportProgressDialog } from '@/components/ImportProgressDialog';
import { useMediaStore } from '@/stores/mediaStore';
import { MediaRecord } from '@/types/models';
import { tauriClient } from '@/api/tauriClient';
import { emitTo, listen } from '@tauri-apps/api/event';
import { REQUEST_PREVIEW_DATA } from '@/constants/request';
import { MEDIA_PREVIEW } from '@/constants/windows';
import { PREVIEW_MEDIA_LIST } from '@/constants/data';
import { open } from '@tauri-apps/plugin-dialog';
import { confirm } from '@tauri-apps/plugin-dialog';
import { useTauriEvent } from '@/hooks/use-tauri-event';
import { IMAGES_DEAL_PROGRESS_EVENT, IMAGES_DELETE_PROGRESS_EVENT } from '@/constants/events';
import { ImagesDealProgressEvent, ImagesDeleteProgressEvent } from '@/types/tauri';
import { mediaApi } from '@/api/mediaApi';

export const Route = createFileRoute('/library')({
  component: LibraryRoute,
});

function LibraryRoute() {
  const { photos, isLoading, loadMedia } = useMediaStore();
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('date-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [progressOperationType, setProgressOperationType] = useState<'import' | 'delete'>('import');

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  // 监听导入进度事件，当导入完成时重新加载媒体数据
  useTauriEvent<ImagesDealProgressEvent>(IMAGES_DEAL_PROGRESS_EVENT, (event) => {
    const progressData = event.payload;
    
    // 当导入完成时，重新加载媒体数据
    if (progressData.step === 'completed') {
      console.log('导入操作完成，重新加载媒体数据');
      // 延迟一点时间确保数据库操作完成，参考Tauri事件时序竞争解决方案
      setTimeout(() => {
        loadMedia();
        // 在延迟后设置关闭进度对话框，作为兜底机制
        setTimeout(() => {
          setShowProgressDialog(false);
        }, 2500); // 稍微比ImportProgressDialog的自动关闭时间晚一点
      }, 500);
    }
  });

  // 监听删除进度事件，当删除完成时重新加载媒体数据
  useTauriEvent<ImagesDeleteProgressEvent>(IMAGES_DELETE_PROGRESS_EVENT, (event) => {
    const progressData = event.payload;
    
    // 当删除完成时，重新加载媒体数据
    if (progressData.step === 'completed') {
      console.log('删除操作完成，重新加载媒体数据');
      // 延迟一点时间确保数据库操作完成，参考Tauri事件时序竞争解决方案
      setTimeout(() => {
        loadMedia();
        // 在延迟后设置关闭进度对话框，作为兜底机制
        setTimeout(() => {
          setShowProgressDialog(false);
        }, 2500); // 稍微比ImportProgressDialog的自动关闭时间晚一点
      }, 500);
    }
  });

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
      if (selected && Array.isArray(selected)) {
        setProgressOperationType('import');
        setShowProgressDialog(true);
        // 使用带数据库功能的导入方法
        const images = await tauriClient.call('get_media_records_with_db', { paths: selected }) as MediaRecord[];
        console.log('文件导入完成，处理了', images.length, '个文件');
      }
    } catch (error) {
      console.error('导入文件失败:', error);
      setShowProgressDialog(false);
    }
  };

  const handleImportFolder = async () => {
    try {
      const folder = await open({ directory: true });
      if (folder) {
        setProgressOperationType('import');
        setShowProgressDialog(true);
        const images = await tauriClient.call('read_images_in_dir', {
          dir: folder,
        }) as MediaRecord[];
        console.log('文件夹导入完成，处理了', images.length, '个文件');
      }
    } catch (error) {
      console.error('导入文件夹失败:', error);
      setShowProgressDialog(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMedia.size === 0) {
      console.warn('没有选中任何媒体文件');
      return;
    }

    // 显示确认对话框
    const confirmed = await confirm(`确定要删除选中的 ${selectedMedia.size} 个媒体文件吗？此操作不可撤销。`);
    if (!confirmed) return;

    try {
      setProgressOperationType('delete');
      setShowProgressDialog(true);
      const mediaIds = Array.from(selectedMedia);
      const deletedCount = await mediaApi.deleteSelectedMedia(mediaIds);
      console.log(`已成功删除 ${deletedCount} 个媒体文件`);
      // 清空选中状态
      setSelectedMedia(new Set());
    } catch (error) {
      console.error('删除选中媒体失败:', error);
      setShowProgressDialog(false);
    }
  };

  const handleDeleteAll = async () => {
    // 显示确认对话框
    const confirmed = await confirm('确定要清空所有媒体文件吗？此操作不可撤销。');
    if (!confirmed) return;

    try {
      setProgressOperationType('delete');
      setShowProgressDialog(true);
      const result = await mediaApi.deleteAllMedia();
      console.log('清空所有媒体文件完成:', result);
      // 清空选中状态
      setSelectedMedia(new Set());
    } catch (error) {
      console.error('清空所有媒体失败:', error);
      setShowProgressDialog(false);
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
          onDeleteSelected={handleDeleteSelected}
          onDeleteAll={handleDeleteAll}
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

        {/* 进度对话框 */}
        <ImportProgressDialog 
          isOpen={showProgressDialog} 
          onClose={() => setShowProgressDialog(false)} 
          operationType={progressOperationType}
        />
      </div>
    </Layout>
  );
}
