# Validation Schema Fix - KB Hierarchical Filtering

## Problem Identified

When testing KB hierarchical filtering with file selection, the backend returned a validation error:

```
"field": "body.filters.kb",
"message": "Expected array, received object",
"code": "INVALID_TYPE"
```

## Root Cause

The Node.js backend validation schema (`es_validators.ts`) only accepted the **old format** for KB filters:

```typescript
kb: z.array(z.string().uuid()).optional()
```

But the frontend was sending the **new hierarchical format**:

```json
{
  "kb": {
    "kbIds": ["uuid1"],
    "folderIds": ["uuid2"],
    "fileIds": ["uuid3"]
  }
}
```

## Solution Implemented

Updated the Zod validation schema to accept **both formats** using a union type:

```typescript
kb: z.union([
  z.array(z.string().uuid()), // Old format: ["uuid1", "uuid2"]
  z.object({
    // New format: { kbIds: [...], folderIds: [...], fileIds: [...] }
    kbIds: z.array(z.string().uuid()).optional(),
    folderIds: z.array(z.string().uuid()).optional(),
    fileIds: z.array(z.string().uuid()).optional(),
  }),
]).optional()
```

## Files Modified

### `backend/nodejs/apps/src/modules/enterprise_search/validators/es_validators.ts`

Updated three schemas to support both formats:

1. **enterpriseSearchCreateSchema** (line 30)
   - Main search endpoint validation
   - Used by `/api/v1/conversations/stream` POST requests

2. **addMessageParamsSchema** (line 68)
   - Add message to conversation validation
   - Used when adding new messages with filters

3. **regenerateAnswersParamsSchema** (line 107)
   - Regenerate answers with filters validation
   - Used when regenerating responses with different filters

## Backward Compatibility

✅ **Fully backward compatible**

- Old format (array of UUIDs) still works
- New format (hierarchical object) now works
- Zod union type accepts either format
- No breaking changes to existing code

## Testing

To verify the fix works:

1. Select a file in the KB resource selector
2. Send a message with the file selected
3. Should now pass validation and reach the backend
4. Backend will parse and apply the hierarchical filters

## Data Flow After Fix

```
Frontend sends:
{
  "filters": {
    "kb": {
      "kbIds": ["uuid1"],
      "folderIds": [],
      "fileIds": ["uuid2"]
    }
  }
}
    ↓
Node.js validation accepts (new format)
    ↓
Python backend receives and parses
    ↓
Applies hierarchical filtering
    ↓
Returns only selected file records
```

## Related Documentation

- `.qodo/docs/kb_filtering.md` - Full implementation details
- `.qodo/REVIEW_CHECKLIST.md` - Code review results
- `.qodo/DEPLOYMENT_SUMMARY.md` - Deployment guide

## Next Steps

1. Rebuild Docker container with the validation schema fix
2. Test KB filtering with various selections (KB only, folder, file)
3. Verify no validation errors occur
4. Confirm filtered results are returned correctly
