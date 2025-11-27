# Record Structure Analysis - KB Hierarchical Filtering

## Key Finding: Records Use Edge Collections, Not Properties

After examining the codebase, I discovered that **records do NOT have `kbId` or `folderId` properties**. Instead, relationships are stored in edge collections:

### Record Structure (from `models/records.py`)

```python
@dataclass
class Record(Node):
    _key: str = ""
    org_id: str = ""
    record_name: str = ""
    external_record_id: str = ""
    record_type: str = ""  # FILE, DRIVE, WEBPAGE, MESSAGE, MAIL, OTHERS
    origin: str = ""  # UPLOAD or CONNECTOR
    connector_name: Optional[str] = None
    # ... other properties
    # NO kbId or folderId properties!
```

### How Records Relate to KBs and Folders

**KB Relationship** (via `belongsTo` edge):
```
User --[permissionsToKB]--> KB
                              |
                         [belongsTo]
                              |
                            Record
```

**Folder Relationship** (via `recordRelations` edge):
```
KB --[belongsTo]--> Record
                      |
                 [recordRelations]
                      |
                    Folder
```

### Edge Collections Used

1. **`belongsTo`** - Connects records to KBs
   - `_from`: record._id
   - `_to`: kb._id

2. **`recordRelations`** - Connects records to folders
   - `_from`: record._id
   - `_to`: folder._id
   - `relationshipType`: "PARENT_CHILD"

3. **`permissionsToKB`** - User permissions to KBs
   - `_from`: user._id
   - `_to`: kb._id
   - `role`: permission level

## Why Current Filtering Fails

The current `kb_filtering_service.py` queries are wrong because they:

1. **KB Filtering**: Try to filter by `record.kbId` (doesn't exist)
   - Should traverse `belongsTo` edges instead

2. **Folder Filtering**: Try to filter by `record.folderId` (doesn't exist)
   - Should traverse `recordRelations` edges instead

## Correct AQL Query Structure

### For KB Filtering

```aql
FOR record IN @@records
    FILTER record.orgId == @org_id
    FILTER record.isDeleted != true
    
    // Find the KB this record belongs to
    FOR belongsEdge IN @@belongs_to
        FILTER belongsEdge._from == record._id
        LET kb = DOCUMENT(belongsEdge._to)
        FILTER kb._key IN @kb_ids
        
        RETURN record
```

### For Folder Filtering

```aql
FOR record IN @@records
    FILTER record.orgId == @org_id
    FILTER record.isDeleted != true
    
    // Find the folder this record belongs to
    FOR relationEdge IN @@record_relations
        FILTER relationEdge._from == record._id
        FILTER relationEdge.relationshipType == "PARENT_CHILD"
        LET folder = DOCUMENT(relationEdge._to)
        FILTER folder._key IN @folder_ids
        
        RETURN record
```

### For File Filtering

```aql
FOR record IN @@records
    FILTER record._key IN @file_ids
    FILTER record.orgId == @org_id
    FILTER record.isDeleted != true
    RETURN record
```

## Implementation Status

**Current Status**: ❌ BROKEN
- Queries assume properties that don't exist
- Returns 0 records for all KB/folder filtering

**Next Step**: Rewrite `kb_filtering_service.py` to use edge traversal instead of property filtering

## Files to Update

1. `backend/python/app/connectors/services/kb_filtering_service.py`
   - Rewrite all three query methods to use edge traversal
   - Use `belongsTo` for KB filtering
   - Use `recordRelations` for folder filtering
   - Use direct `_key` match for file filtering

## Related Code References

- Record model: `backend/python/app/models/records.py`
- Edge definitions: `backend/python/app/schema/arango/edges.py`
- Working example: `backend/python/app/connectors/services/base_arango_service.py` (lines 12037+)
  - The `get_accessible_records` method shows correct edge traversal patterns
