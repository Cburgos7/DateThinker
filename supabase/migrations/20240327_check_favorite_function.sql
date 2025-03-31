-- Create a function to check if a favorite exists with proper type handling
CREATE OR REPLACE FUNCTION check_favorite_exists(user_id_param TEXT, place_id_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  favorite_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM favorites 
    WHERE user_id = user_id_param 
    AND place_id::TEXT = place_id_param
  ) INTO favorite_exists;
  
  RETURN favorite_exists;
END;
$$ LANGUAGE plpgsql;

