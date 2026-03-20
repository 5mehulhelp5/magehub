### Declarative Schema Overview

Magento 2.3+ uses declarative schema (`etc/db_schema.xml`) to define database
table structures instead of legacy InstallSchema/UpgradeSchema scripts. The
framework compares the declared state against the current database state and
generates the necessary ALTER/CREATE statements automatically. This is the
only supported approach for new modules.

### db_schema.xml Structure

Define tables, columns, constraints, and indexes in `etc/db_schema.xml`. Each
column requires `name`, `xsi:type`, and `nullable` attributes at minimum.
Primary keys use `<constraint>` with `referenceId="PRIMARY"`. Foreign keys
reference the parent table and column, and Magento enforces referential
integrity at the database level.

### Schema Whitelist

After modifying `db_schema.xml`, run
`bin/magento setup:db-declaration:generate-whitelist --module-name=Vendor_Module`
to update `etc/db_schema_whitelist.json`. The whitelist tracks which schema
elements your module owns so that `setup:upgrade` can safely drop columns and
tables during uninstallation. Never edit the whitelist manually.

### Data Patches

Use `DataPatchInterface` classes in `Setup/Patch/Data/` for inserting or
modifying data — configuration values, attribute creation, seed data. Data
patches run once and are tracked in the `patch_list` table. Make every patch
idempotent because `setup:upgrade` may execute patches in any order relative
to other modules.

### Schema Patches

Use `SchemaPatchInterface` in `Setup/Patch/Schema/` for DDL operations that
cannot be expressed in declarative schema — triggers, stored procedures, or
complex index operations. Schema patches are rare; prefer declarative schema
for standard table changes.

### Patch Dependencies and Aliases

Implement `getDependencies()` to declare ordering between patches within the
same module. Return `getAliases()` with the old class name when renaming a
patch to prevent re-execution.
