-- Function to check if a favorite exists
CREATE OR REPLACE FUNCTION check_favorite_exists(p_user_id TEXT, p_place_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM favorites 
    WHERE user_id = p_user_id 
    AND place_id::TEXT = p_place_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to remove a favorite by place_id
CREATE OR REPLACE FUNCTION remove_favorite_by_place_id(p_user_id TEXT, p_place_id TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM favorites 
  WHERE user_id = p_user_id 
  AND place_id::TEXT = p_place_id;
END;
$$ LANGUAGE plpgsql;

