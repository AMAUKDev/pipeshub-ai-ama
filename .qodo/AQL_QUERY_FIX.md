# AQL Query Fix - KB Filtering Returns 0 Records

## Problem Identified

When testing KB hierarchical filtering with file selection, the backend was returning 0 records even though files existed:

```
✅ Query completed - found 0 accessible records
```

## Root Cause

The AQL queries in `kb_filtering_service.py` were using incorrect field comparisons:

**Wrong**:
```aql
FOR record IN @@records
    FILTER record._id IN @file_ids  # ❌ _id is full document ID (records/uuid)
    ...
```

**Correct**:
```aql
FOR record IN @@records
    FILTER record._key IN @file_ids  # ✅ _key is just the UUID
    ...
```

### Why This Matters

In ArangoDB:
- `_id` = Full document identifier (e.g., `records/d96266ed-5271-4459-a0cc-ac46acb691cb`)
- `_key` = Just the key part (e.g., `d96266ed-5271-4459-a0cc-ac46acb691cb`)

The frontend sends UUIDs (which are `_key` values), not full `_id` values. The queries were comparing against the wrong field.

## Solution Implemented

Updated all three filtering queries in `kb_filtering_service.py`:

### 1. File Filtering Query
```aql
FOR record IN @@records
    FILTER record._key IN @file_ids  # ✅ Fixed
    FILTER record.orgId == @org_id
    FILTER record.isDeleted != true
    RETURN record
```

### 2. Folder Filtering Query
```aql
FOR folder IN @@files
    FILTER folder._key IN @folder_ids  # ✅ Fixed
    FILTER folder.orgId == @org_id
    
    FOR relation IN @@record_relations
        FILTER relation._to == folder._id
        FILTER relation.relationshipType == "PARENT_CHILD"
        LET record = DOCUMENT(relation._from)
        FILTER record != null
        FILTER record.orgId == @org_id
        FILTER record.isDeleted != true
        RETURN record
```

### 3. KB Filtering Query
```aql
FOR kb IN @@records
    FILTER kb._key IN @kb_ids  # ✅ Fixed
    FILTER kb.orgId == @org_id
    FILTER kb.isDeleted != true
    
    FOR relation IN @@belongs_to
        FILTER relation._to == kb._id
        LET record = DOCUMENT(relation._from)
        FILTER record != null
        FILTER record.orgId == @org_id
        FILTER record.isDeleted != true
        RETURN record
```

## Files Modified

- ✅ `backend/python/app/connectors/services/kb_filtering_service.py`
  - Updated `_build_accessible_records_query()` method
  - Changed all `_id` comparisons to `_key` for UUID filtering
  - Updated docstring to clarify that IDs are `_key` values

## Testing After Fix

1. **Rebuild Docker container**
2. **Select a file** in KB resource selector
3. **Send a message** with file selected
4. **Expected result**: Records should be returned (not 0)
5. **Check logs**: Should see `Found X accessible records` instead of `Found 0 accessible records`

## Data Flow After Fix

```
Frontend sends file UUID:
d96266ed-5271-4459-a0cc-ac46acb691cb
    ↓
Backend receives as @file_ids
    ↓
AQL query: FILTER record._key IN @file_ids
    ↓
Matches records with _key = d96266ed-5271-4459-a0cc-ac46acb691cb
    ↓
Returns matching records ✅
```

## Related Documentation

- `.qodo/docs/kb_filtering.md` - Full implementation details (updated)
- `.qodo/IMPLEMENTATION_STATUS.md` - Overall status
- `.qodo/VALIDATION_SCHEMA_FIX.md` - Validation schema fix

## Summary

**Issue**: AQL queries using wrong field (`_id` instead of `_key`)
**Impact**: File/folder/KB filtering returned 0 records
**Fix**: Changed all UUID comparisons to use `_key` field
**Status**: ✅ FIXED

The filtering should now work correctly!
