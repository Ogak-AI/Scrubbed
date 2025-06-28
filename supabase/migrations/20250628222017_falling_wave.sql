/*
  # Add Price Field to Waste Requests

  1. Changes
    - Add `price` column to `waste_requests` table
    - Column is nullable to allow requests without specified price
    - Uses DECIMAL type for precise monetary values

  2. Security
    - No changes to RLS policies needed
    - Existing policies will cover the new column
*/

-- Add price column to waste_requests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'waste_requests' AND column_name = 'price'
  ) THEN
    ALTER TABLE waste_requests ADD COLUMN price DECIMAL(10,2);
    RAISE NOTICE 'Added price column to waste_requests table';
  ELSE
    RAISE NOTICE 'price column already exists in waste_requests table';
  END IF;
END $$;

-- Create index for price queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_waste_requests_price ON waste_requests(price) WHERE price IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN waste_requests.price IS 'Optional price offered by the dumper for the waste collection service';