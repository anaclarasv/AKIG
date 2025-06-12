-- Add supervisor_id column to users table
ALTER TABLE users 
ADD COLUMN supervisor_id varchar REFERENCES users(id);

-- Create index for better performance
CREATE INDEX idx_users_supervisor_id ON users(supervisor_id);

-- Update existing agents to have a supervisor (optional - can be done manually)
-- This is just an example, you might want to assign supervisors based on your business logic
UPDATE users 
SET supervisor_id = (
  SELECT id FROM users 
  WHERE role = 'supervisor' 
  AND company_id = users.company_id 
  LIMIT 1
) 
WHERE role = 'agent' AND supervisor_id IS NULL;