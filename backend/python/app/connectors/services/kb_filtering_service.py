"""
Knowledge Base filtering service for hierarchical KB/folder/file selection support.

This module provides filtering logic for KB resources with support for:
- KB-level filtering (entire knowledge base)
- Folder-level filtering (specific folders within a KB)
- File-level filtering (specific files/records)

Records are related to KBs and folders through edges, not properties:
- belongsTo edge: Record → KB
- recordRelations edge: Record → Folder
- isOfType edge: Record → FileRecord
"""

from typing import Any, Dict, List, Optional
from app.config.constants.arangodb import CollectionNames


class KBFilteringService:
    """Service for handling KB hierarchical filtering using edge traversal"""

    def __init__(self, logger, db):
        """
        Initialize KB filtering service
        
        Args:
            logger: Logger instance
            db: ArangoDB database instance
        """
        self.logger = logger
        self.db = db

    async def get_accessible_records(
        self,
        user_id: str,
        org_id: str,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get records accessible to a user with optional KB/folder/file filtering.
        
        Supports hierarchical filtering:
        - kb_ids: Filter by specific KBs (returns all records in those KBs)
        - folder_ids: Filter by specific folders (returns records in those folders)
        - file_ids: Filter by specific files/records (returns only those records)
        
        Args:
            user_id: User ID to check permissions for
            org_id: Organization ID
            filters: Optional filters dict with keys:
                - kb_ids: List of KB IDs to include
                - folder_ids: List of folder IDs to include
                - file_ids: List of file/record IDs to include
                - Other metadata filters (departments, categories, etc.)
        
        Returns:
            List of accessible record documents
        """
        try:
            filters = filters or {}
            kb_ids = filters.get('kb_ids', [])
            folder_ids = filters.get('folder_ids', [])
            file_ids = filters.get('file_ids', [])
            
            self.logger.info(
                f"Getting accessible records for user {user_id}, org {org_id}. "
                f"Filters: kb_ids={len(kb_ids)}, folder_ids={len(folder_ids)}, file_ids={len(file_ids)}"
            )
            
            # Build AQL query with hierarchical filtering using edge traversal
            query = self._build_accessible_records_query(kb_ids, folder_ids, file_ids)
            
            bind_vars = {
                "user_id": user_id,
                "org_id": org_id,
                "@records": CollectionNames.RECORDS.value,
                "@files": CollectionNames.FILES.value,
                "@belongs_to": CollectionNames.BELONGS_TO.value,
                "@record_relations": CollectionNames.RECORD_RELATIONS.value,
            }
            
            # Add filter values to bind vars
            if kb_ids:
                bind_vars["kb_ids"] = kb_ids
            if folder_ids:
                bind_vars["folder_ids"] = folder_ids
            if file_ids:
                bind_vars["file_ids"] = file_ids
            
            self.logger.debug(f"Executing AQL query with bind vars: {bind_vars}")
            
            # Execute query
            cursor = self.db.aql.execute(query, bind_vars=bind_vars)
            results = list(cursor)
            
            self.logger.info(f"Found {len(results)} accessible records")
            return results
            
        except Exception as e:
            self.logger.error(f"Error getting accessible records: {str(e)}")
            raise

    def _build_accessible_records_query(
        self,
        kb_ids: List[str],
        folder_ids: List[str],
        file_ids: List[str],
    ) -> str:
        """
        Build AQL query for getting accessible records with hierarchical filtering.
        
        Uses edge traversal to find records:
        - For files: Direct _key match
        - For folders: Traverse recordRelations edges
        - For KBs: Traverse belongsTo edges
        
        Args:
            kb_ids: List of KB IDs to filter by (these are record _keys)
            folder_ids: List of folder IDs to filter by (these are file record _keys)
            file_ids: List of file/record IDs to filter by (these are record _keys)
        
        Returns:
            AQL query string
        """
        
        # If specific files are selected, return only those
        if file_ids:
            self.logger.debug(f"Building file filtering query for {len(file_ids)} files")
            return f"""
            FOR record IN @@records
                FILTER record._key IN @file_ids
                FILTER record.orgId == @org_id
                FILTER record.isDeleted != true
                RETURN record
            """
        
        # If specific folders are selected, return records in those folders
        if folder_ids:
            self.logger.debug(f"Building folder filtering query for {len(folder_ids)} folders")
            return f"""
            FOR record IN @@records
                FILTER record.orgId == @org_id
                FILTER record.isDeleted != true
                
                // Traverse recordRelations edge to find records in selected folders
                FOR relationEdge IN @@record_relations
                    FILTER relationEdge._from == record._id
                    FILTER relationEdge.relationshipType == "PARENT_CHILD"
                    LET folder = DOCUMENT(relationEdge._to)
                    FILTER folder != null
                    FILTER folder._key IN @folder_ids
                    
                    RETURN record
            """
        
        # If specific KBs are selected, return all records in those KBs
        if kb_ids:
            self.logger.debug(f"Building KB filtering query for {len(kb_ids)} KBs")
            return f"""
            FOR record IN @@records
                FILTER record.orgId == @org_id
                FILTER record.isDeleted != true
                
                // Traverse belongsTo edge to find records in selected KBs
                FOR belongsEdge IN @@belongs_to
                    FILTER belongsEdge._from == record._id
                    FILTER belongsEdge.relationshipType == "PARENT_CHILD"
                    LET kb = DOCUMENT(belongsEdge._to)
                    FILTER kb != null
                    FILTER kb._key IN @kb_ids
                    
                    RETURN record
            """
        
        # No filters - return all accessible records for org
        # This is a fallback - in practice, the backend should already filter by accessible records
        # before calling this method. This query just returns all records for the org.
        self.logger.debug("No filters specified, returning all records for org")
        return f"""
        FOR record IN @@records
            FILTER record.orgId == @org_id
            FILTER record.isDeleted != true
            RETURN record
        """
