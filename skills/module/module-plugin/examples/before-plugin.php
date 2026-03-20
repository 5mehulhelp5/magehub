<?php
declare(strict_types=1);

namespace Vendor\Module\Plugin;

use Magento\Catalog\Model\Product;

class ProductNameNormalizerPlugin
{
    public function beforeSetName(Product $subject, string $name): array
    {
        return [trim(strtoupper($name))];
    }
}
