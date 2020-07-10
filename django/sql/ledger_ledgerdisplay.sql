drop view ledger_ledgerdisplay
go
create view ledger_ledgerdisplay
as
select ledger_ledger.*, source_entity.name as sourcename, dest_entity.name as destname
from ledger_ledger
inner join ledger_entity as source_entity on ledger_ledger.transsource_id = source_entity.id
inner join ledger_entity as dest_entity on ledger_ledger.transdest_id = dest_entity.id 
