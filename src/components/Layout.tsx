import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  detailPanel?: ReactNode;
  className?: string;
}

export function Layout({
  children,
  sidebar,
  detailPanel,
  className,
}: LayoutProps) {
  return (
    <div className={cn('flex h-screen bg-background', className)}>
      {/* 侧边栏 */}
      <aside className="w-64 border-r border-border bg-sidebar">
        {sidebar}
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex">
          {/* 照片网格区域 */}
          <div className="flex-1 overflow-auto">{children}</div>

          {/* 详情面板 */}
          {detailPanel && (
            <aside className="w-80 border-l border-border bg-sidebar">
              {detailPanel}
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
