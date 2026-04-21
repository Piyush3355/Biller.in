create or replace function public.mark_overdue_invoices()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_count integer := 0;
begin
  update public.invoices
  set status = 'overdue'
  where user_id = auth.uid()
    and status = 'pending'
    and due_date is not null
    and due_date < current_date;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;
