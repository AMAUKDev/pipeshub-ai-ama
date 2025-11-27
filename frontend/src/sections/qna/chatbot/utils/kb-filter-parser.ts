/**
 * Utility functions for parsing hierarchical KB resource selections
 *
 * Format:
 * - KB only: "kb:kbId"
 * - Folder: "kb:kbId:folder:folderId"
 * - File: "kb:kbId:file:fileId"
 */

export interface ParsedKBFilters {
  kbIds: string[];
  folderIds: string[];
  fileIds: string[];
}

/**
 * Parse a single encoded KB resource string
 * @param encoded - Encoded string like "kb:kbId:folder:folderId" or raw UUID
 * @returns Object with kbId, type, and resourceId
 */
export function parseKBResource(encoded: string): {
  kbId: string;
  type: 'kb' | 'folder' | 'file';
  resourceId?: string;
} | null {
  if (!encoded || typeof encoded !== 'string') {
    return null;
  }

  const parts = encoded.split(':');

  // Format: kb:kbId
  if (parts.length === 2 && parts[0] === 'kb') {
    return {
      kbId: parts[1],
      type: 'kb',
    };
  }

  // Format: kb:kbId:folder:folderId
  if (parts.length === 4 && parts[0] === 'kb' && parts[2] === 'folder') {
    return {
      kbId: parts[1],
      type: 'folder',
      resourceId: parts[3],
    };
  }

  // Format: kb:kbId:file:fileId
  if (parts.length === 4 && parts[0] === 'kb' && parts[2] === 'file') {
    return {
      kbId: parts[1],
      type: 'file',
      resourceId: parts[3],
    };
  }

  // Format: raw UUID (treat as KB-only selection)
  // UUID format: 8-4-4-4-12 hex digits
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(encoded)) {
    return {
      kbId: encoded,
      type: 'kb',
    };
  }

  console.warn(`Invalid KB resource format: ${encoded}`);
  return null;
}

/**
 * Parse all selected KB resources into structured format
 * @param selectedKbIds - Array of encoded KB resource strings
 * @returns Structured object with separate arrays for KBs, folders, and files
 */
export function parseKBFilters(selectedKbIds: string[]): ParsedKBFilters {
  const result: ParsedKBFilters = {
    kbIds: [],
    folderIds: [],
    fileIds: [],
  };

  if (!selectedKbIds || selectedKbIds.length === 0) {
    return result;
  }

  const seenKBs = new Set<string>();
  const seenFolders = new Set<string>();
  const seenFiles = new Set<string>();

  for (const encoded of selectedKbIds) {
    const parsed = parseKBResource(encoded);
    if (parsed) {
      // Always add KB ID (deduplicate)
      if (!seenKBs.has(parsed.kbId)) {
        result.kbIds.push(parsed.kbId);
        seenKBs.add(parsed.kbId);
      }

      // Add folder or file ID if present
      if (parsed.type === 'folder' && parsed.resourceId) {
        if (!seenFolders.has(parsed.resourceId)) {
          result.folderIds.push(parsed.resourceId);
          seenFolders.add(parsed.resourceId);
        }
      } else if (parsed.type === 'file' && parsed.resourceId) {
        if (!seenFiles.has(parsed.resourceId)) {
          result.fileIds.push(parsed.resourceId);
          seenFiles.add(parsed.resourceId);
        }
      }
    }
  }

  return result;
}

/**
 * Convert parsed KB filters back to the encoded format for display
 * @param filters - Parsed KB filters
 * @returns Array of encoded strings
 */
export function encodeKBFilters(filters: ParsedKBFilters): string[] {
  const encoded: string[] = [];

  // Add folder selections
  for (const folderId of filters.folderIds) {
    // Find which KB this folder belongs to
    // For now, we'll need to match with kbIds
    // In practice, the first KB ID is used (could be improved with metadata)
    if (filters.kbIds.length > 0) {
      encoded.push(`kb:${filters.kbIds[0]}:folder:${folderId}`);
    }
  }

  // Add file selections
  for (const fileId of filters.fileIds) {
    if (filters.kbIds.length > 0) {
      encoded.push(`kb:${filters.kbIds[0]}:file:${fileId}`);
    }
  }

  // Add KB-only selections (if no folders/files from that KB)
  for (const kbId of filters.kbIds) {
    const hasChildSelection = filters.folderIds.length > 0 || filters.fileIds.length > 0;
    if (!hasChildSelection) {
      encoded.push(`kb:${kbId}`);
    }
  }

  return encoded;
}
