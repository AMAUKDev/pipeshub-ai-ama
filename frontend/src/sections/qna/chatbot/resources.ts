// resources.ts - Types for hierarchical KB resources

/**
 * Represents a hierarchical resource (KB or folder) in the knowledge base
 */
export interface HierarchicalKBResource {
  id: string;
  name: string;
  type: 'kb' | 'folder';
  parentId?: string;
  children?: HierarchicalKBResource[];
  path?: string; // e.g., "knowledge/cases/amauk25"
  rootFolderId?: string; // For KB items, the root folder ID
  isLoading?: boolean; // For tracking folder content loading state
}

/**
 * Represents a selected resource with its full path
 */
export interface SelectedResource {
  id: string;
  name: string;
  type: 'kb' | 'folder';
  path: string; // Full hierarchical path
  kbId: string; // The root KB ID
  folderId?: string; // The folder ID if it's a folder
}

/**
 * Represents the state of folder expansions
 */
export interface FolderExpansionState {
  [key: string]: boolean; // key is "kb-id" or "kb-id:folder-id"
}
