-- Drop and recreate admin delete policy with proper OR logic
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;

CREATE POLICY "Admins can delete any comment" 
ON public.comments 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);