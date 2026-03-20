<?php
declare(strict_types=1);

namespace Vendor\Module\Model;

use Magento\Catalog\Api\ProductRepositoryInterface;
use Magento\Framework\Api\SearchCriteriaBuilder;
use Psr\Log\LoggerInterface;

class ProductDataExporter
{
    public function __construct(
        private readonly ProductRepositoryInterface $productRepository,
        private readonly SearchCriteriaBuilder $searchCriteriaBuilder,
        private readonly LoggerInterface $logger
    ) {
    }

    public function getActiveProducts(int $storeId): array
    {
        $criteria = $this->searchCriteriaBuilder
            ->addFilter('status', 1)
            ->addFilter('store_id', $storeId)
            ->create();

        try {
            $result = $this->productRepository->getList($criteria);
        } catch (\Exception $e) {
            $this->logger->error('Failed to load products', [
                'store_id' => $storeId,
                'exception' => $e->getMessage(),
            ]);

            return [];
        }

        return $result->getItems();
    }
}
