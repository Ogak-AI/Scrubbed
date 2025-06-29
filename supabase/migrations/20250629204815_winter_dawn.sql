/*
  # Fix Missing Price Column in Waste Requests

  1. Changes
    - Ensure price column exists in waste_requests table
    - Add proper index for price queries
    - Verify column type and constraints
    - Add helpful comments

  2. Safety
    - Uses IF NOT EXISTS to prevent errors if column already exists
    - Safe for re-running multiple times
    - Includes verification steps
*/

-- Ensure price column exists in waste_requests table
DO $$
BEGIN
  -- Check if price column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'waste_requests' 
    AND column_name = 'price'
  ) THEN
    -- Add the price column
    ALTER TABLE waste_requests ADD COLUMN price DECIMAL(10,2);
    RAISE NOTICE 'Added price column to waste_requests table';
  ELSE
    RAISE NOTICE 'Price column already exists in waste_requests table';
  END IF;

  -- Verify the column was created with correct type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'waste_requests' 
    AND column_name = 'price'
    AND data_type = 'numeric'
  ) THEN
    RAISE NOTICE 'Price column verified with correct DECIMAL(10,2) type';
  ELSE
    RAISE WARNING 'Price column exists but may have incorrect type';
  END IF;
END $$;

-- Create index for price queries if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_waste_requests_price 
ON waste_requests(price) 
WHERE price IS NOT NULL;

-- Add helpful comment to document the column
COMMENT ON COLUMN waste_requests.price IS 'Optional price offered by the dumper for the waste collection service in USD';

-- Verify the table structure includes all required columns
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    col_name TEXT;
BEGIN
    -- Check for all required columns
    FOR col_name IN SELECT unnest(ARRAY['id', 'dumper_id', 'collector_id', 'waste_type', 'description', 'location', 'address', 'status', 'scheduled_time', 'estimated_amount', 'price', 'photos', 'created_at', 'updated_at'])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'waste_requests'
            AND column_name = col_name
        ) THEN
            missing_columns := array_append(missing_columns, col_name);
        END IF;
    END LOOP;

    IF array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING 'Missing columns in waste_requests table: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'All required columns exist in waste_requests table';
    END IF;
END $$;

-- Update any existing NULL price values to ensure consistency
UPDATE waste_requests 
SET price = NULL 
WHERE price IS NOT NULL AND price < 0;

-- Add a check constraint to ensure price is non-negative (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_schema = 'public'
        AND constraint_name = 'waste_requests_price_check'
    ) THEN
        ALTER TABLE waste_requests 
        ADD CONSTRAINT waste_requests_price_check 
        CHECK (price IS NULL OR price >= 0);
        RAISE NOTICE 'Added check constraint for non-negative price';
    ELSE
        RAISE NOTICE 'Price check constraint already exists';
    END IF;
END $$;

-- Final verification and summary
DO $$
DECLARE
    price_column_exists BOOLEAN;
    price_index_exists BOOLEAN;
    total_requests INTEGER;
    requests_with_price INTEGER;
BEGIN
    -- Check if price column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'waste_requests'
        AND column_name = 'price'
    ) INTO price_column_exists;

    -- Check if price index exists
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'waste_requests'
        AND indexname = 'idx_waste_requests_price'
    ) INTO price_index_exists;

    -- Get statistics
    SELECT COUNT(*) INTO total_requests FROM waste_requests;
    SELECT COUNT(*) INTO requests_with_price FROM waste_requests WHERE price IS NOT NULL;

    -- Report results
    RAISE NOTICE '=== PRICE COLUMN FIX SUMMARY ===';
    RAISE NOTICE 'Price column exists: %', price_column_exists;
    RAISE NOTICE 'Price index exists: %', price_index_exists;
    RAISE NOTICE 'Total waste requests: %', total_requests;
    RAISE NOTICE 'Requests with price: %', requests_with_price;
    
    IF price_column_exists THEN
        RAISE NOTICE 'SUCCESS: Price column is now available for use';
    ELSE
        RAISE ERROR 'FAILED: Price column could not be created';
    END IF;
END $$;