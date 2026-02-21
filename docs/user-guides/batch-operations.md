# Batch Operations

This guide covers practical workflows for using batch commands to work with multiple Notion resources at once.

## When to Use Batch Commands

Use batch commands when you need to:

- Fetch data from several pages, blocks, or databases in one call
- Clean up multiple blocks (delete child blocks, remove outdated content)
- Process a list of resource IDs from a file or another command's output
- Build automation pipelines that operate on many resources

Batch commands run all requests in parallel, so they complete faster than looping through individual commands.

## Retrieve Multiple Pages

The most common use case is fetching several pages at once.

### From the command line

Pass comma-separated IDs directly:

```bash
notion-cli batch retrieve --ids "PAGE_ID_1,PAGE_ID_2,PAGE_ID_3" --json
```

### From a file

Create a text file with one ID per line, then pipe it:

```bash
# page_ids.txt contains one ID per line
cat page_ids.txt | notion-cli batch retrieve --json
```

### Using Notion URLs

Copy URLs directly from your browser. The resolver extracts the ID automatically:

```bash
notion-cli batch retrieve --ids \
  "https://notion.so/My-Page-abc123,https://notion.so/Other-Page-def456"
```

You can mix URLs and raw IDs in the same command:

```bash
notion-cli batch retrieve --ids \
  "https://notion.so/My-Page-abc123,2fc3826d337780419021c0097da10f33"
```

## Retrieve Different Resource Types

By default, batch retrieve assumes pages. Use `--type` to change:

```bash
# Retrieve blocks
notion-cli batch retrieve --ids "BLOCK1,BLOCK2" --type block --json

# Retrieve databases
notion-cli batch retrieve --ids "DB1,DB2" --type database --json

# Retrieve databases by name (from workspace cache)
notion-cli batch retrieve --ids "Tasks,Projects" --type database
```

## Delete Multiple Blocks

Use `batch delete` to remove several blocks at once. Deleted blocks go to Notion's trash and can be recovered from the Notion UI.

```bash
# Delete specific blocks
notion-cli batch delete --ids "BLOCK_ID_1,BLOCK_ID_2,BLOCK_ID_3" --json

# Delete from a file
cat blocks_to_remove.txt | notion-cli batch delete --json
```

### Get Block IDs First

To find block IDs, list a page's children first:

```bash
# List all blocks on a page
notion-cli block retrieve children PAGE_ID --json

# Extract block IDs with jq, then delete them
notion-cli block retrieve children PAGE_ID --json \
  | jq -r '.data.results[].id' \
  | notion-cli batch delete --json
```

## Handle Partial Failures

Both batch commands handle failures per-item. If one ID fails, the rest still succeed. Check the JSON output to identify which items failed:

```bash
# Some IDs might fail — check the results
notion-cli batch retrieve --ids "VALID_ID,INVALID_ID,VALID_ID_2" --json
```

The output includes counts and per-item status:

```json
{
  "success": true,
  "total": 3,
  "succeeded": 2,
  "failed": 1,
  "results": [
    { "id": "VALID_ID", "success": true, "data": { "..." } },
    { "id": "INVALID_ID", "success": false, "error": "OBJECT_NOT_FOUND" },
    { "id": "VALID_ID_2", "success": true, "data": { "..." } }
  ]
}
```

The exit code is `0` only when all items succeed. Use this in scripts:

```bash
notion-cli batch retrieve --ids "ID1,ID2" --json
if [ $? -ne 0 ]; then
  echo "Some items failed"
fi
```

## Scripting Recipes

### Export page titles to CSV

```bash
notion-cli batch retrieve --ids "ID1,ID2,ID3" --json \
  | jq -r '.results[] | select(.success) | [.data.id, .data.properties.title.title[0].plain_text] | @csv'
```

### Delete all blocks on a page

```bash
PAGE_ID="your_page_id"

# Get all child block IDs, then batch delete them
notion-cli block retrieve children "$PAGE_ID" --json \
  | jq -r '.data.results[].id' \
  | notion-cli batch delete --json
```

### Verify multiple pages exist

```bash
# Quick check — exit code tells you if any failed
notion-cli batch retrieve --ids "ID1,ID2,ID3" --compact-json > /dev/null
echo "Exit code: $?"
```

## Related Documentation

- **[Batch Commands Reference](../batch.md)** — Full flag and argument reference
- **[Smart ID Resolution](../architecture/smart-id-resolution.md)** — How URLs and names resolve to IDs
- **[Output Formats](output-formats.md)** — JSON, CSV, and table options
- **[Error Handling](error-handling-examples.md)** — Understanding error codes
