# Complete KB/Folder/File to Record Storage Flow

## 🎯 Overview

This document traces the complete flow from when a user uploads files to a KB/folder through to how records are stored and related in the database.

---

## 📊 Data Flow Diagram

```
User Upload (Frontend)
    ↓
POST /:kbId/upload or /:kbId/folder/:folderId/upload
    ↓
Node.js Controller (uploadRecordsToKB or uploadRecordsToFolder)
    ↓
1. Create Record & FileRecord objects (in-memory)
2. Save file to storage (S3/local)
3. Get documentId from storage
4. Send to Python backend
    ↓
Python Backend (POST /api/v1/kb/{kbId}/upload)
    ↓
1. Create Record document in ArangoDB
2. Create FileRecord document in ArangoDB
3. Create belongsTo edge (Record → KB)
4. Create recordRelations edge (Record → Folder) if folder upload
5. Create isOfType edge (Record → FileRecord)
    ↓
Records stored with relationships
```

---

## 🔍 Step-by-Step Breakdown

### Step 1: Frontend Upload
**File**: `frontend/src/sections/knowledgebase/...`

User selects files and uploads to:
- `POST /api/v1/kb/{kbId}/upload` - Upload to KB root
- `POST /api/v1/kb/{kbId}/folder/{folderId}/upload` - Upload to specific folder

### Step 2: Node.js Controller Processing
**File**: `backend/nodejs/apps/src/modules/knowledge_base/controllers/kb_controllers.ts`

**Function**: `uploadRecordsToKB` (line 633) or `uploadRecordsToFolder` (line 804)

**What happens**:
```typescript
// 1. Create Record object (in-memory)
const record: IRecordDocument = {
  _key: uuidv4(),                    // Unique ID
  orgId: orgId,
  recordName: fileName,
  externalRecordId: '',              // Will be filled by storage
  recordType: RECORD_TYPE.FILE,
  origin: ORIGIN_TYPE.UPLOAD,        // "UPLOAD" for KB files
  createdAtTimestamp: currentTime,
  updatedAtTimestamp: currentTime,
  sourceCreatedAtTimestamp: validLastModified,
  sourceLastModifiedTimestamp: validLastModified,
  isDeleted: false,
  isArchived: false,
  indexingStatus: INDEXING_STATUS.NOT_STARTED,
  version: 1,
  webUrl: `/record/${key}`,
  mimeType: correctMimeType,
};

// 2. Create FileRecord object (in-memory)
const fileRecord: IFileRecordDocument = {
  _key: key,                         // Same as record._key
  orgId: orgId,
  name: fileName,
  isFile: true,
  extension: extension,
  mimeType: correctMimeType,
  sizeInBytes: size,
  webUrl: webUrl,
};

// 3. Save file to storage and get documentId
const { documentId, documentName } = await saveFileToStorageAndGetDocumentId(
  req, file, fileName, isVersioned, record, fileRecord,
  keyValueStoreService, appConfig.storage, recordRelationService
);

// 4. Update record with storage info
record.externalRecordId = documentId;
record.recordName = documentName;

// 5. Send to Python backend
const response = await executeConnectorCommand(
  `${appConfig.connectorBackend}/api/v1/kb/${kbId}/upload`,
  HttpMethod.POST,
  req.headers,
  {
    files: processedFiles.map(pf => ({
      record: pf.record,
      fileRecord: pf.fileRecord,
      filePath: pf.filePath,
      lastModified: pf.lastModified,
    })),
  }
);
```

### Step 3: Python Backend Processing
**File**: `backend/python/app/connectors/services/base_arango_service.py`

**Function**: `upload_records` (line 11672)

**What happens**:

1. **Create Record Document**:
   ```python
   # Insert record into 'records' collection
   record_doc = {
     "_key": record._key,
     "orgId": org_id,
     "recordName": record.record_name,
     "externalRecordId": record.external_record_id,
     "recordType": record.record_type,
     "origin": record.origin,  # "UPLOAD"
     "createdAtTimestamp": record.created_at_timestamp,
     # ... other fields
   }
   records_collection.insert(record_doc)
   ```

2. **Create FileRecord Document**:
   ```python
   # Insert file record into 'files' collection
   file_record_doc = {
     "_key": file_record._key,  # Same as record._key
     "orgId": org_id,
     "name": file_record.name,
     "isFile": true,
     "extension": file_record.extension,
     "mimeType": file_record.mime_type,
     "sizeInBytes": file_record.size_in_bytes,
   }
   files_collection.insert(file_record_doc)
   ```

3. **Create belongsTo Edge** (Record → KB):
   ```python
   # Connect record to KB
   belongs_to_edge = {
     "_from": f"records/{record._key}",
     "_to": f"records/{kb_id}",  # KB is also a record!
     "relationshipType": "PARENT_CHILD"
   }
   belongs_to_collection.insert(belongs_to_edge)
   ```

4. **Create recordRelations Edge** (Record → Folder) - if folder upload:
   ```python
   # Connect record to folder
   relation_edge = {
     "_from": f"records/{record._key}",
     "_to": f"files/{folder_id}",  # Folder is a file record
     "relationshipType": "PARENT_CHILD"
   }
   record_relations_collection.insert(relation_edge)
   ```

5. **Create isOfType Edge** (Record → FileRecord):
   ```python
   # Connect record to its file metadata
   is_of_type_edge = {
     "_from": f"records/{record._key}",
     "_to": f"files/{file_record._key}",
   }
   is_of_type_collection.insert(is_of_type_edge)
   ```

---

## 📦 Data Structure in ArangoDB

### Collections

**records** collection:
```json
{
  "_key": "d96266ed-5271-4459-a0cc-ac46acb691cb",
  "_id": "records/d96266ed-5271-4459-a0cc-ac46acb691cb",
  "orgId": "6920b58c68baaf9103e51822",
  "recordName": "document.pdf",
  "externalRecordId": "s3://bucket/path/to/file",
  "recordType": "FILE",
  "origin": "UPLOAD",
  "createdAtTimestamp": 1732200034316,
  "isDeleted": false,
  "indexingStatus": "NOT_STARTED"
}
```

**files** collection:
```json
{
  "_key": "d96266ed-5271-4459-a0cc-ac46acb691cb",
  "_id": "files/d96266ed-5271-4459-a0cc-ac46acb691cb",
  "orgId": "6920b58c68baaf9103e51822",
  "name": "document.pdf",
  "isFile": true,
  "extension": "pdf",
  "mimeType": "application/pdf",
  "sizeInBytes": 1024000
}
```

### Edges

**belongsTo** edge (Record → KB):
```json
{
  "_from": "records/d96266ed-5271-4459-a0cc-ac46acb691cb",
  "_to": "records/65590061-7558-493e-bbc4-9c77a79419bf",  // KB ID
  "relationshipType": "PARENT_CHILD"
}
```

**recordRelations** edge (Record → Folder):
```json
{
  "_from": "records/d96266ed-5271-4459-a0cc-ac46acb691cb",
  "_to": "files/fcfa2861-5c98-47bc-9a64-476d23ae323b",  // Folder ID
  "relationshipType": "PARENT_CHILD"
}
```

**isOfType** edge (Record → FileRecord):
```json
{
  "_from": "records/d96266ed-5271-4459-a0cc-ac46acb691cb",
  "_to": "files/d96266ed-5271-4459-a0cc-ac46acb691cb"
}
```

---

## 🔗 How to Query Records by KB/Folder

### Query Records in a KB

```aql
FOR record IN records
    FILTER record.orgId == @org_id
    FILTER record.isDeleted != true
    
    // Find the KB this record belongs to
    FOR belongsEdge IN belongsTo
        FILTER belongsEdge._from == record._id
        LET kb = DOCUMENT(belongsEdge._to)
        FILTER kb._key IN @kb_ids
        
        RETURN record
```

### Query Records in a Folder

```aql
FOR record IN records
    FILTER record.orgId == @org_id
    FILTER record.isDeleted != true
    
    // Find the folder this record belongs to
    FOR relationEdge IN recordRelations
        FILTER relationEdge._from == record._id
        FILTER relationEdge.relationshipType == "PARENT_CHILD"
        LET folder = DOCUMENT(relationEdge._to)
        FILTER folder._key IN @folder_ids
        
        RETURN record
```

### Query Specific Files

```aql
FOR record IN records
    FILTER record._key IN @file_ids
    FILTER record.orgId == @org_id
    FILTER record.isDeleted != true
    RETURN record
```

---

## 🎯 Key Insights for Filtering

1. **Records don't have `kbId` or `folderId` properties** - they're stored in edges
2. **KB is also a record** - it's stored in the `records` collection with `recordType: "KB"`
3. **Folders are file records** - they're stored in the `files` collection with `isFile: false`
4. **Relationships are edges** - `belongsTo` connects records to KBs, `recordRelations` connects records to folders
5. **To filter by KB/folder, you must traverse edges** - direct property filtering won't work

---

## 🔧 Correct Filtering Implementation

The `kb_filtering_service.py` needs to:

1. **For KB filtering**: Traverse `belongsTo` edges to find records in selected KBs
2. **For folder filtering**: Traverse `recordRelations` edges to find records in selected folders
3. **For file filtering**: Direct `_key` match on records

This is why the current implementation returns 0 records - it's trying to filter by non-existent properties instead of traversing edges.
