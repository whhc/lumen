import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Folder,
  Users,
  Star,
  Clock,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  children?: NavItem[];
  expanded?: boolean;
}

export function Sidebar({ className }: SidebarProps) {
  const [navItems, setNavItems] = useState<NavItem[]>([
    {
      id: 'folders',
      label: '文件夹',
      icon: Folder,
      expanded: true,
      children: [
        { id: 'pictures', label: '图片库', icon: Folder, count: 1247 },
        { id: 'desktop', label: '桌面', icon: Folder, count: 89 },
        { id: 'downloads', label: '下载', icon: Folder, count: 156 },
        { id: 'recent', label: '最近添加', icon: Clock, count: 42 },
      ],
    },
    {
      id: 'collections',
      label: '智能合集',
      icon: Star,
      children: [
        { id: 'favorites', label: '收藏夹', icon: Star, count: 23 },
        { id: 'screenshots', label: '截图', icon: Folder, count: 156 },
        { id: 'portraits', label: '人像', icon: Users, count: 89 },
      ],
    },
    {
      id: 'people',
      label: '人物合集',
      icon: Users,
      children: [
        { id: 'person-1', label: '未命名人物1', icon: Users, count: 142 },
        { id: 'person-2', label: '人物A', icon: Users, count: 89 },
        { id: 'person-3', label: '人物B', icon: Users, count: 56 },
        { id: 'unnamed', label: '未命名', icon: Users, count: 34 },
      ],
    },
    {
      id: 'trash',
      label: '回收站',
      icon: Trash2,
      count: 12,
    },
  ]);

  const toggleExpanded = (id: string) => {
    setNavItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, expanded: !item.expanded } : item
      )
    );
  };

  const NavItemComponent = ({
    item,
    level = 0,
  }: {
    item: NavItem;
    level?: number;
  }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = item.expanded ?? false;

    return (
      <div>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start font-normal',
            level === 0 ? 'h-10 px-4' : 'h-8 px-4 pl-8',
            'hover:bg-accent hover:text-accent-foreground'
          )}
          onClick={() => (hasChildren ? toggleExpanded(item.id) : undefined)}
        >
          {hasChildren && (
            <div className="mr-2">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </div>
          )}
          <item.icon className="w-4 h-4 mr-3" />
          <span className="flex-1 text-left truncate">{item.label}</span>
          {item.count !== undefined && (
            <span className="text-xs text-muted-foreground ml-2">
              {item.count}
            </span>
          )}
        </Button>

        {hasChildren && isExpanded && (
          <div className="ml-4">
            {item.children!.map((child) => (
              <NavItemComponent key={child.id} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 顶部标题 */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Lumen</h2>
        <p className="text-sm text-muted-foreground">照片管理</p>
      </div>

      {/* 导航内容 */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {navItems.map((item) => (
            <NavItemComponent key={item.id} item={item} />
          ))}
        </div>
      </ScrollArea>

      {/* 底部操作 */}
      <div className="p-4 border-t border-border">
        <Button variant="outline" className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          新建合集
        </Button>
      </div>
    </div>
  );
}
