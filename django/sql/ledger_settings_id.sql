create view ledger_settings_id as
select ledger_settings.user_id as user_id,
ledger_entity_home.id as home_account,
ledger_entity_unknown.id as unknown_account
from ledger_settings
left join ledger_entity ledger_entity_home on ledger_settings.user_id = ledger_entity_home.user_id and ledger_settings.home_account = ledger_entity_home.name
left join ledger_entity ledger_entity_unknown on ledger_settings.user_id = ledger_entity_unknown.user_id and ledger_settings.unknown_account = ledger_entity_unknown.name;
