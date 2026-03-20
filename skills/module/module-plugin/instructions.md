### Magento 2 Plugin Development Guide

Plugins (interceptors) allow you to modify the behavior of public methods
without changing the original class. This is a core Magento 2 extension mechanism.

### When to Use Plugins

Use plugins when you need to:

- Modify input parameters before method execution (before plugin)
- Modify return values after method execution (after plugin)
- Completely wrap method execution (around plugin)

### Plugin Types

1. **Before Plugin** - Modifies input parameters
2. **After Plugin** - Modifies return value
3. **Around Plugin** - Wraps entire method (use sparingly)

### Implementation Steps

1. Create plugin class in `Plugin/` directory
2. Declare plugin in `etc/di.xml`
3. Implement appropriate plugin method(s)
