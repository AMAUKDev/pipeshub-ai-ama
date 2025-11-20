import React, { useState, useCallback, useMemo } from 'react';
import { Icon } from '@iconify/react';
import chevronDownIcon from '@iconify-icons/mdi/chevron-down';
import chevronRightIcon from '@iconify-icons/mdi/chevron-right';
import folderIcon from '@iconify-icons/mdi/folder-outline';
import folderOpenIcon from '@iconify-icons/mdi/folder-open';
import databaseIcon from '@iconify-icons/mdi/database-outline';
import { Box, CircularProgress, Theme, useTheme } from '@mui/material';
import { HierarchicalKBResource, FolderExpansionState } from '../resources';

interface KBFolderTreeProps {
  resources: HierarchicalKBResource[];
  selectedIds: string[];
  onToggleSelect: (resourceId: string, resourceType: 'kb' | 'folder') => void;
  onFolderExpand: (resourceId: string) => void;
  expandedFolders: FolderExpansionState;
  isDark: boolean;
  theme: Theme;
  isLoading?: boolean;
}

interface TreeItemProps {
  resource: HierarchicalKBResource;
  level: number;
  selectedIds: string[];
  onToggleSelect: (resourceId: string, resourceType: 'kb' | 'folder') => void;
  onFolderExpand: (resourceId: string) => void;
  expandedFolders: FolderExpansionState;
  isDark: boolean;
  theme: Theme;
}

const TreeItem: React.FC<TreeItemProps> = ({
  resource,
  level,
  selectedIds,
  onToggleSelect,
  onFolderExpand,
  expandedFolders,
  isDark,
  theme,
}) => {
  const isExpanded = expandedFolders[resource.id] || false;
  const isSelected = selectedIds.includes(resource.id);
  const hasChildren = resource.children && resource.children.length > 0;
  const isLoading = resource.isLoading || false;

  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFolderExpand(resource.id);
    },
    [resource.id, onFolderExpand]
  );

  const handleToggleSelect = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSelect(resource.id, resource.type);
    },
    [resource.id, resource.type, onToggleSelect]
  );

  const paddingLeft = level * 16;
  const isFolder = resource.type === 'folder';
  const isKB = resource.type === 'kb';

  return (
    <Box key={resource.id}>
      <Box
        onClick={handleToggleSelect}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 0.75,
          ml: `${paddingLeft}px`,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          backgroundColor: isSelected
            ? isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.08)'
            : 'transparent',
          border: isSelected
            ? `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`
            : '1px solid transparent',
          borderRadius: '4px',
          mb: 0.25,
          '&:hover': {
            backgroundColor: isSelected
              ? isDark
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(0, 0, 0, 0.12)'
              : isDark
                ? 'rgba(255, 255, 255, 0.04)'
                : 'rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren ? (
          <Box
            onClick={handleToggleExpand}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {isLoading ? (
              <CircularProgress size={14} />
            ) : (
              <Icon
                icon={isExpanded ? chevronDownIcon : chevronRightIcon}
                width={16}
                height={16}
                style={{
                  color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                }}
              />
            )}
          </Box>
        ) : (
          <Box sx={{ width: 20, flexShrink: 0 }} />
        )}

        {/* Resource Icon */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            flexShrink: 0,
          }}
        >
          {isKB ? (
            <Icon
              icon={databaseIcon}
              width={16}
              height={16}
              style={{
                color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
              }}
            />
          ) : (
            <Icon
              icon={isExpanded ? folderOpenIcon : folderIcon}
              width={16}
              height={16}
              style={{
                color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
              }}
            />
          )}
        </Box>

        {/* Resource Name */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: '0.875rem',
            fontWeight: 400,
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {resource.name}
        </Box>

        {/* Selection Indicator */}
        {isSelected && (
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
              flexShrink: 0,
            }}
          />
        )}
      </Box>

      {/* Render Children */}
      {hasChildren && isExpanded && (
        <Box>
          {resource.children!.map((child) => (
            <TreeItem
              key={child.id}
              resource={child}
              level={level + 1}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onFolderExpand={onFolderExpand}
              expandedFolders={expandedFolders}
              isDark={isDark}
              theme={theme}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

const KBFolderTree: React.FC<KBFolderTreeProps> = ({
  resources,
  selectedIds,
  onToggleSelect,
  onFolderExpand,
  expandedFolders,
  isDark,
  theme,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!resources || resources.length === 0) {
    return (
      <Box sx={{ py: 2, textAlign: 'center', fontSize: '0.875rem', color: 'text.secondary' }}>
        No knowledge bases available
      </Box>
    );
  }

  return (
    <Box sx={{ py: 0.5 }}>
      {resources.map((resource) => (
        <TreeItem
          key={resource.id}
          resource={resource}
          level={0}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onFolderExpand={onFolderExpand}
          expandedFolders={expandedFolders}
          isDark={isDark}
          theme={theme}
        />
      ))}
    </Box>
  );
};

export default KBFolderTree;
