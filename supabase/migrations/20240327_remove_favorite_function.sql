-- Create a function to remove a favorite with proper type handling
CREATE OR REPLACE FUNCTION remove_favorite(user_id_param TEXT, place_id_param TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM favorites 
  WHERE user_id = user_id_param 
  AND (place_id = place_id_param OR place_id::TEXT = place_id_param);
END;
$$ LANGUAGE plpgsql;

