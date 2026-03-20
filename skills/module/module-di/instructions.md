### Magento 2 Dependency Injection System

Magento's object manager resolves all class dependencies through constructor
injection configured in `etc/di.xml`. Understanding this system is essential
because every service, model, and controller receives its collaborators
through the DI container — never through manual instantiation.

### Constructor Injection

Declare all dependencies as constructor parameters with interface type hints.
The object manager automatically resolves concrete implementations based on
`di.xml` preferences. Avoid requesting concrete classes directly — interface
injection keeps your code decoupled and allows other modules to substitute
implementations via preferences.

### Preferences

Use `<preference>` to bind an interface to its default concrete implementation.
Preferences are global unless scoped to a specific area (`etc/frontend/di.xml`,
`etc/adminhtml/di.xml`). Only one preference per interface can be active at a
time — later-loaded modules override earlier ones based on sequence order.

### Virtual Types

Create `<virtualType>` entries when you need a class with a different set of
constructor arguments but no behavioral changes. Virtual types avoid creating
empty subclasses solely to change injected values. They are resolved only by
the DI container — they have no real PHP class file and cannot be used with
`instanceof` checks.

### Proxy Classes

Declare `<proxy>` types for expensive dependencies that are not always used.
Proxies defer instantiation until the first method call, reducing the cost of
object graph construction. Use proxies on optional collaborators in commands,
cron jobs, and observers where the dependency is invoked conditionally.

### Area Scoping

Place `di.xml` in `etc/` for global scope, `etc/frontend/` for storefront,
and `etc/adminhtml/` for admin. Area-scoped configuration overrides global
configuration. Keep preferences and type configurations in the narrowest scope
that applies to prevent unintended side effects in other areas.
