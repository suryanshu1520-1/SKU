-- Grant permissions to standard Supabase roles
GRANT ALL ON TABLE pib_digests TO anon;
GRANT ALL ON TABLE pib_digests TO authenticated;
GRANT ALL ON TABLE pib_digests TO service_role;

-- Enable Row Level Security (RLS)
ALTER TABLE pib_digests ENABLE ROW LEVEL SECURITY;

-- Allow the frontend (anon) to read the digests
CREATE POLICY "Allow public read access on pib_digests"
  ON pib_digests FOR SELECT
  USING (true);
