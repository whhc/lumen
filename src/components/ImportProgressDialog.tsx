import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useTauriEvent } from '@/hooks/use-tauri-event';
import { IMAGES_DEAL_PROGRESS_EVENT, IMAGES_DELETE_PROGRESS_EVENT } from '@/constants/events';
import { ImagesDealProgressEvent, ImagesDeleteProgressEvent } from '@/types/tauri';

interface ImportProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  // 新增：区分操作类型
  operationType?: 'import' | 'delete';
}

export function ImportProgressDialog({ isOpen, onClose, operationType = 'import' }: ImportProgressDialogProps) {
  const [progress, setProgress] = useState<ImagesDealProgressEvent | ImagesDeleteProgressEvent>({
    current: 0,
    total: 0,
    currentFile: undefined,
    step: operationType === 'import' ? 'scanning' : 'deleting_selected',
  });

  const [isCompleted, setIsCompleted] = useState(false);

  // 监听导入进度事件
  useTauriEvent<ImagesDealProgressEvent>(IMAGES_DEAL_PROGRESS_EVENT, (event) => {
    if (operationType !== 'import') return; // 只在导入模式下处理导入事件
    
    const progressData = event.payload;
    setProgress(progressData);
    
    // 检查是否完成
    if (progressData.step === 'completed') {
      setIsCompleted(true);
      
      // 延迟 2 秒后自动关闭对话框
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  });

  // 监听删除进度事件
  useTauriEvent<ImagesDeleteProgressEvent>(IMAGES_DELETE_PROGRESS_EVENT, (event) => {
    if (operationType !== 'delete') return; // 只在删除模式下处理删除事件
    
    const progressData = event.payload;
    setProgress(progressData);
    
    // 检查是否完成
    if (progressData.step === 'completed') {
      setIsCompleted(true);
      
      // 延迟 2 秒后自动关闭对话框
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  });

  // 重置状态当对话框打开时
  useEffect(() => {
    if (isOpen) {
      setProgress({
        current: 0,
        total: 0,
        currentFile: undefined,
        step: operationType === 'import' ? 'scanning' : 'deleting_selected',
      });
      setIsCompleted(false);
    }
  }, [isOpen, operationType]);

  const getDialogTitle = () => {
    return operationType === 'delete' ? '正在删除文件' : '正在导入图片';
  };

  const getStepText = (step: string) => {
    switch (step) {
      case 'scanning':
        return '正在扫描文件...';
      case 'generating_thumbnails':
        return '正在生成缩略图...';
      case 'extracting_metadata':
        return '正在提取元数据...';
      case 'checking_database':
        return '正在检查数据库...';
      case 'saving_to_database':
        return '正在保存到数据库...';
      case 'deleting_selected':
        return '正在删除选中文件...';
      case 'deleting_all':
        return '正在清空所有文件...';
      case 'completed':
        return '处理完成！';
      default:
        return '处理中...';
    }
  };

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  const handleClose = () => {
    if (isCompleted || progress.step === 'completed') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {getDialogTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 步骤描述 */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {getStepText(progress.step)}
            </p>
          </div>

          {/* 进度条 */}
          <div className="space-y-2">
            <Progress value={progressPercentage} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.current} / {progress.total}</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
          </div>

          {/* 当前处理的文件 */}
          {progress.currentFile && progress.step !== 'completed' && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                正在处理: {progress.currentFile} {progress.step}
              </p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-center pt-4">
            {isCompleted || progress.step === 'completed' ? (
              <Button onClick={handleClose} className="w-full">
                完成
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={handleClose}
                disabled={progress.step !== 'scanning' && progress.current > 0}
                className="w-full"
              >
                {progress.step === 'scanning' || progress.current === 0 ? '取消' : '正在处理...'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}