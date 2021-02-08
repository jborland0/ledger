create view ledger_entitydisplay
as
select ledger_entity.*, ledger_category.name as category_name from ledger_entity
inner join ledger_category on ledger_entity.category_id = ledger_category.id
