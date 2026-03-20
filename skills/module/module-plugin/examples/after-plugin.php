<?php
declare(strict_types=1);

namespace Vendor\Module\Plugin;

use Magento\Catalog\Model\Product;

class ProductNameSuffixPlugin
{
    public function afterGetName(Product $subject, string $result): string
    {
        return $result . ' - On Sale';
    }
}
