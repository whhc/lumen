import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutGrid,
  List,
  Upload,
  CheckSquare,
  ArrowUpDown,
  Filter,
  MoreHorizontal,
  ChevronDown,
  File,
  Folder,
  Trash2,
  TrashIcon,
} from 'lucide-react';

interface ToolbarProps {
  selectedCount: number;
  viewMode: 'grid' | 'list';
  sortBy: string;
  searchQuery: string;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onSortChange: (sort: string) => void;
  onSearchChange: (query: string) => void;
  onImportFiles: () => void;
  onImportFolder: () => void;
  onSelectAll: () => void;
  onDeleteSelected?: () => void;
  onDeleteAll?: () => void;
  className?: string;
}

export function Toolbar({
  selectedCount,
  viewMode,
  sortBy,
  searchQuery,
  onViewModeChange,
  onSortChange,
  onSearchChange,
  onImportFiles,
  onImportFolder,
  onSelectAll,
  onDeleteSelected,
  onDeleteAll,
  className,
}: ToolbarProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        {/* 左侧操作区 */}
        <div className="flex items-center gap-2">
          {/* 导入下拉菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                导入
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onImportFiles}>
                <File className="w-4 h-4 mr-2" />
                导入文件
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onImportFolder}>
                <Folder className="w-4 h-4 mr-2" />
                导入文件夹
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={onSelectAll}>
            <CheckSquare className="w-4 h-4 mr-2" />
            选择
          </Button>

          {/* 删除操作按钮 */}
          {selectedCount > 0 && onDeleteSelected && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={onDeleteSelected}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除选中 ({selectedCount})
            </Button>
          )}

          {selectedCount > 0 && (
            <span className="text-sm text-muted-foreground">
              已选择 {selectedCount} 项
            </span>
          )}
        </div>

        {/* 中间搜索区 */}
        <div className="flex-1 max-w-md mx-4">
          <Input
            placeholder="搜索照片..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full"
          />
        </div>

        {/* 右侧控制区 */}
        <div className="flex items-center gap-2">
          {/* 视图模式切换 */}
          <div className="flex items-center border border-border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
              className="h-8 px-3"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className="h-8 px-3"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* 排序 */}
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue placeholder="排序" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">最新优先</SelectItem>
              <SelectItem value="date-asc">最旧优先</SelectItem>
              <SelectItem value="name-asc">名称 A-Z</SelectItem>
              <SelectItem value="name-desc">名称 Z-A</SelectItem>
              <SelectItem value="size-desc">大小降序</SelectItem>
              <SelectItem value="size-asc">大小升序</SelectItem>
            </SelectContent>
          </Select>

          {/* 更多操作 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Filter className="w-4 h-4 mr-2" />
                筛选条件
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ArrowUpDown className="w-4 h-4 mr-2" />
                批量操作
              </DropdownMenuItem>
              {onDeleteAll && (
                <DropdownMenuItem 
                  onClick={onDeleteAll}
                  className="text-destructive focus:text-destructive"
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  清空所有
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
