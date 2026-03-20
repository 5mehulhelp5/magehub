### Magento 2 Module Bootstrap

Every custom module requires three files before Magento will recognize it:
`registration.php`, `etc/module.xml`, and `composer.json`. Missing any one of
these causes the module to be silently ignored during setup:upgrade.

### Directory Layout

Place module source under `app/code/<Vendor>/<Module>/` for project-level
modules or ship as a Composer package installed into `vendor/`. The directory
name must match the `Vendor_Module` identifier exactly — case-sensitive on
Linux filesystems.

Recommended initial structure:

- `registration.php` — registers the component with the framework
- `etc/module.xml` — declares the module name and setup version sequence
- `composer.json` — PSR-4 autoloading, package metadata, and dependencies

### Registration File

`registration.php` must call `ComponentRegistrar::register()` with the
`MODULE` type and the `Vendor_ModuleName` identifier. This file is
auto-included by the Composer-generated autoloader; it must not contain class
definitions or side-effects beyond the single register call.

### Module XML and Sequencing

Declare `<module name="Vendor_ModuleName">` in `etc/module.xml`. Use the
`<sequence>` element to list modules that must load before yours — this
controls schema patch and config merge ordering, not runtime dependency
injection. Only declare sequence entries for modules whose configuration,
schema, or layout your module directly overrides.

### Composer Configuration

Set `type` to `magento2-module` so the Magento Composer installer places the
package correctly. Map the PSR-4 namespace root to the module directory.
Require `magento/framework` at a minimum and add specific module dependencies
as Composer `require` entries, keeping them aligned with `<sequence>`.

### Post-Scaffold Steps

Run `bin/magento module:enable Vendor_ModuleName` followed by
`bin/magento setup:upgrade` to register the module in `config.php` and
execute any setup patches.
