"""
Migration script: updates the devices table from old schema to new schema.

Old schema: name, status (text enum), device_status_history.status (text enum)
New schema: device_type (ENUM), inventory_status (ENUM), client_op_status (ENUM),
            plus hw_developer_id, hw_qa_report_url, agro_qa_by, agro_qa_report_url,
            repair_receipt_timestamp, fault_cause_report_url, estimated_repair_date.

Run: python migrate_devices.py
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()

import asyncpg


OLD_STATUS_MAP = {
    'UNDER_DEVELOPMENT': 'under_hw_development',
    'QA_FOR_AGRONOMIST': 'pending_agro_qa',
    'QA_PASSED_IN_INVENTORY': 'ready_to_assign',
    'INSTALLED': 'assigned_to_client',
    'BACK_AT_OFFICE': 'under_repair',
}

MIGRATION_SQL = """
-- 1. Create ENUM types
DO $$ BEGIN
    CREATE TYPE devicetype AS ENUM ('MOBILE_DEVICE', 'AQUASAVE_PRO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE inventorystatus AS ENUM ('under_hw_development', 'pending_agro_qa', 'ready_to_assign', 'assigned_to_client', 'under_repair');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE clientopstatus AS ENUM ('active', 'inactive_crop_pause', 'faulty');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add new columns (if they don't already exist)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_type devicetype;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS inventory_status inventorystatus;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS client_op_status clientopstatus;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS hw_developer_id UUID REFERENCES users(id);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS hw_qa_report_url VARCHAR;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS agro_qa_by UUID REFERENCES users(id);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS agro_qa_report_url VARCHAR;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS repair_receipt_timestamp TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS fault_cause_report_url VARCHAR;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS estimated_repair_date DATE;

-- 3. Migrate existing data
--    Map old status to new inventory_status, default device_type to MOBILE_DEVICE
UPDATE devices
SET inventory_status = CASE status
    WHEN 'UNDER_DEVELOPMENT' THEN 'under_hw_development'::inventorystatus
    WHEN 'QA_FOR_AGRONOMIST' THEN 'pending_agro_qa'::inventorystatus
    WHEN 'QA_PASSED_IN_INVENTORY' THEN 'ready_to_assign'::inventorystatus
    WHEN 'INSTALLED' THEN 'assigned_to_client'::inventorystatus
    WHEN 'BACK_AT_OFFICE' THEN 'under_repair'::inventorystatus
    ELSE 'under_hw_development'::inventorystatus
END,
device_type = 'MOBILE_DEVICE'::devicetype;

-- 4. Set NOT NULL constraints after data migration
ALTER TABLE devices ALTER COLUMN device_type SET NOT NULL;
ALTER TABLE devices ALTER COLUMN inventory_status SET NOT NULL;

-- 5. Migrate device_status_history table
ALTER TABLE device_status_history ADD COLUMN IF NOT EXISTS previous_status_new inventorystatus;
ALTER TABLE device_status_history ADD COLUMN IF NOT EXISTS new_status_new inventorystatus;

UPDATE device_status_history
SET previous_status_new = CASE previous_status
    WHEN 'UNDER_DEVELOPMENT' THEN 'under_hw_development'::inventorystatus
    WHEN 'QA_FOR_AGRONOMIST' THEN 'pending_agro_qa'::inventorystatus
    WHEN 'QA_PASSED_IN_INVENTORY' THEN 'ready_to_assign'::inventorystatus
    WHEN 'INSTALLED' THEN 'assigned_to_client'::inventorystatus
    WHEN 'BACK_AT_OFFICE' THEN 'under_repair'::inventorystatus
    ELSE NULL
END,
new_status_new = CASE new_status
    WHEN 'UNDER_DEVELOPMENT' THEN 'under_hw_development'::inventorystatus
    WHEN 'QA_FOR_AGRONOMIST' THEN 'pending_agro_qa'::inventorystatus
    WHEN 'QA_PASSED_IN_INVENTORY' THEN 'ready_to_assign'::inventorystatus
    WHEN 'INSTALLED' THEN 'assigned_to_client'::inventorystatus
    WHEN 'BACK_AT_OFFICE' THEN 'under_repair'::inventorystatus
    ELSE 'under_hw_development'::inventorystatus
END;

-- 6. Drop old columns from devices
ALTER TABLE devices DROP COLUMN IF EXISTS status;
ALTER TABLE devices DROP COLUMN IF EXISTS name;

-- 7. Drop old columns from device_status_history
ALTER TABLE device_status_history DROP COLUMN IF EXISTS previous_status;
ALTER TABLE device_status_history DROP COLUMN IF EXISTS new_status;

-- 8. Rename new columns to original names in device_status_history
ALTER TABLE device_status_history RENAME COLUMN previous_status_new TO previous_status;
ALTER TABLE device_status_history RENAME COLUMN new_status_new TO new_status;

-- 9. Set NOT NULL on new_status in history
ALTER TABLE device_status_history ALTER COLUMN new_status SET NOT NULL;
"""


async def migrate():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not set in environment or .env")
        sys.exit(1)

    conn = await asyncpg.connect(database_url)
    try:
        print("Running migration...")
        await conn.execute(MIGRATION_SQL)
        print("Migration completed successfully!")
    except Exception as e:
        print(f"Migration failed: {e}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(migrate())
