#!/usr/bin/env python3
"""
Mem0.ai to Supermemory Migration Script
========================================
Simple script to migrate memories from Mem0.ai to Supermemory.

Prerequisites:
1. Install required packages:
   pip install mem0ai supermemory python-dotenv

2. Set environment variables:
   export MEM0_API_KEY="your_mem0_api_key"
   export MEM0_ORG_ID="your_org_id"  # Optional
   export MEM0_PROJECT_ID="your_project_id"  # Optional
   export SUPERMEMORY_API_KEY="your_supermemory_api_key"

Usage:
   python mem0-migration-script.py
"""

import os
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional
from mem0 import MemoryClient
from supermemory import Supermemory
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def export_from_mem0(
    api_key: str,
    org_id: Optional[str] = None,
    project_id: Optional[str] = None,
    filters: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Export memories from Mem0.ai using their export API
    """
    print("🔄 Starting Mem0.ai export...")
    
    # Initialize Mem0 client
    client = MemoryClient(
        api_key=api_key,
        org_id=org_id,
        project_id=project_id
    )
    
    # Define export schema - this matches what Mem0 actually returns
    export_schema = {
        "type": "object",
        "properties": {
            "memories": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "content": {"type": "string"},
                        "user_id": {"type": "string"},
                        "agent_id": {"type": "string"},
                        "app_id": {"type": "string"},
                        "run_id": {"type": "string"},
                        "metadata": {"type": "object"},
                        "created_at": {"type": "string"},
                        "updated_at": {"type": "string"}
                    }
                }
            }
        }
    }
    
    try:
        # Step 1: Create export job
        print("📤 Creating export job...")
        export_response = client.create_memory_export(
            schema=export_schema,
            filters=filters if filters else {}
        )
        
        export_id = export_response.get("id")
        print(f"✅ Export job created with ID: {export_id}")
        
        # Step 2: Wait for export to complete
        print("⏳ Waiting for export to complete...")
        time.sleep(5)  # Usually takes a few seconds
        
        # Step 3: Retrieve the exported data using the correct method
        print("📥 Retrieving exported data...")
        export_data = client.get_memory_export(memory_export_id=export_id)
        
        # Step 4: Save backup
        backup_filename = f"mem0_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(backup_filename, "w") as f:
            json.dump(export_data, f, indent=2)
        print(f"💾 Backup saved to: {backup_filename}")
        
        memory_count = len(export_data.get("memories", []))
        print(f"✅ Successfully exported {memory_count} memories from Mem0.ai")
        
        # Show sample of exported data
        if memory_count > 0:
            print("\n📋 Sample exported memory:")
            sample = export_data["memories"][0]
            print(f"  Content: {sample.get('content', 'N/A')[:50]}...")
            print(f"  ID: {sample.get('id', 'None')}")
            print(f"  User ID: {sample.get('user_id', 'None')}")
        
        return export_data
        
    except Exception as e:
        print(f"❌ Error exporting from Mem0: {str(e)}")
        raise

def import_to_supermemory(mem0_data: Dict[str, Any], api_key: str) -> Dict[str, int]:
    """
    Import Mem0 memories into Supermemory
    """
    print("\n🚀 Starting import to Supermemory...")
    
    # Initialize Supermemory client
    client = Supermemory(api_key=api_key)
    
    memories = mem0_data.get("memories", [])
    if not memories:
        print("⚠️  No memories found to import")
        return {"imported": 0, "failed": 0, "skipped": 0}
    
    # Statistics
    stats = {
        "imported": 0,
        "failed": 0,
        "skipped": 0
    }
    
    print(f"📦 Processing {len(memories)} memories...")
    
    for i, memory in enumerate(memories, 1):
        try:
            # Check if content exists
            content = memory.get("content", "").strip()
            if not content:
                print(f"⚠️  [{i}/{len(memories)}] Skipping: No content")
                stats["skipped"] += 1
                continue
            
            # Build container tags
            container_tags = ["imported_from_mem0"]
            
            # Add user tag if present (handle None values)
            user_id = memory.get("user_id")
            if user_id and user_id != "None":
                container_tags.append(f"user_{user_id}")
            
            # Add agent tag if present
            agent_id = memory.get("agent_id")
            if agent_id and agent_id != "None":
                container_tags.append(f"agent_{agent_id}")
            
            # Add app tag if present
            app_id = memory.get("app_id")
            if app_id and app_id != "None":
                container_tags.append(f"app_{app_id}")
            
            # Add session tag if present
            session_id = memory.get("session_id")
            if session_id and session_id != "None":
                container_tags.append(f"session_{session_id}")
            
            # Generate a unique ID if Mem0 didn't provide one
            memory_id = memory.get("id")
            if not memory_id or memory_id == "None":
                # Use content hash for uniqueness
                import hashlib
                memory_id = hashlib.md5(content.encode()).hexdigest()[:8]
            
            # Prepare metadata
            metadata = {
                "source": "mem0_migration",
                "migration_date": datetime.now().isoformat()
            }
            
            # Add original ID if it existed
            if memory.get("id") and memory["id"] != "None":
                metadata["original_id"] = memory["id"]
            
            # Add timestamps if available and not None
            created_at = memory.get("created_at")
            if created_at and created_at != "None":
                metadata["original_created_at"] = created_at
            
            updated_at = memory.get("updated_at")
            if updated_at and updated_at != "None":
                metadata["original_updated_at"] = updated_at
            
            # Add hash information if available
            hash_val = memory.get("hash")
            if hash_val and hash_val != "None":
                metadata["original_hash"] = hash_val
            
            prev_hash = memory.get("prev_hash")
            if prev_hash and prev_hash != "None":
                metadata["original_prev_hash"] = prev_hash
            
            # Merge with existing metadata if it's a valid dict
            if memory.get("metadata") and isinstance(memory["metadata"], dict):
                metadata.update(memory["metadata"])
            
            # Import to Supermemory
            result = client.memories.add(
                content=content,
                container_tags=container_tags,
                custom_id=f"mem0_{memory_id}",
                metadata=metadata
            )
            
            stats["imported"] += 1
            print(f"✅ [{i}/{len(memories)}] Imported: {content[:50]}...")
            
            # Small delay to avoid rate limiting
            if i % 10 == 0:
                time.sleep(0.5)
            
        except Exception as e:
            stats["failed"] += 1
            print(f"❌ [{i}/{len(memories)}] Failed: {str(e)}")
    
    return stats

def verify_migration(api_key: str, expected_count: int):
    """
    Verify that memories were imported correctly
    """
    print("\n🔍 Verifying migration...")
    
    client = Supermemory(api_key=api_key)
    
    try:
        # Check imported memories
        result = client.memories.list(
            container_tags=["imported_from_mem0"],
            limit=100
        )
        
        total_imported = result['pagination']['totalItems']
        print(f"✅ Found {total_imported} imported memories in Supermemory")
        
        # Show sample memories
        if result['memories']:
            print("\n📋 Sample imported memories:")
            for memory in result['memories'][:3]:
                print(f"  - {memory['id']}: {memory.get('summary', 'No summary')[:50]}...")
        
        # Check success rate
        success_rate = (total_imported / expected_count * 100) if expected_count > 0 else 0
        print(f"\n📊 Migration success rate: {success_rate:.1f}%")
        
        return total_imported
        
    except Exception as e:
        print(f"❌ Error during verification: {str(e)}")
        return 0

def main():
    """Main migration function"""
    print("=" * 60)
    print("🎯 Mem0.ai to Supermemory Migration Tool")
    print("=" * 60)
    
    # Get credentials from environment
    mem0_api_key = os.getenv("MEM0_API_KEY")
    mem0_org_id = os.getenv("MEM0_ORG_ID")
    mem0_project_id = os.getenv("MEM0_PROJECT_ID")
    supermemory_api_key = os.getenv("SUPERMEMORY_API_KEY")
    
    # Validate credentials
    if not mem0_api_key:
        print("❌ Error: MEM0_API_KEY environment variable not set")
        return
    
    if not supermemory_api_key:
        print("❌ Error: SUPERMEMORY_API_KEY environment variable not set")
        return
    
    try:
        # Step 1: Export from Mem0
        print("\n📤 STEP 1: Export from Mem0.ai")
        print("-" * 40)
        
        # You can add filters here if needed
        # Example: filters = {"AND": [{"user_id": "specific_user"}]}
        filters = None
        
        mem0_data = export_from_mem0(
            api_key=mem0_api_key,
            org_id=mem0_org_id,
            project_id=mem0_project_id,
            filters=filters
        )
        
        # Step 2: Import to Supermemory
        print("\n📥 STEP 2: Import to Supermemory")
        print("-" * 40)
        
        stats = import_to_supermemory(mem0_data, supermemory_api_key)
        
        # Step 3: Verify migration
        print("\n✔️  STEP 3: Verification")
        print("-" * 40)
        
        expected_count = len(mem0_data.get("memories", []))
        verify_migration(supermemory_api_key, expected_count)
        
        # Final summary
        print("\n" + "=" * 60)
        print("📊 MIGRATION SUMMARY")
        print("=" * 60)
        print(f"📤 Exported from Mem0: {expected_count}")
        print(f"✅ Successfully imported: {stats['imported']}")
        print(f"⚠️  Skipped (no content): {stats['skipped']}")
        print(f"❌ Failed: {stats['failed']}")
        
        if stats['imported'] == expected_count - stats['skipped']:
            print("\n🎉 Migration completed successfully!")
        elif stats['imported'] > 0:
            print("\n⚠️  Migration completed with some issues. Check the logs above.")
        else:
            print("\n❌ Migration failed. Please check your credentials and try again.")
            
    except Exception as e:
        print(f"\n❌ Migration error: {str(e)}")
        print("Please check your credentials and network connection.")

if __name__ == "__main__":
    main()