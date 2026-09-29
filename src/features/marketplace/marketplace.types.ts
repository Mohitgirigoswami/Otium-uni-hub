import { ItemConditionType, MarketplaceCategoryType } from "@/lib/types";

export interface MarketplaceFilters {
  category?: string;
  condition?: string;
  status?: string;
  search?: string;
  limit?: number;
}

export interface CreateMarketplaceItemParams {
  sellerId: string;
  title: string;
  description: string;
  priceRupees: number;
  category: MarketplaceCategoryType;
  condition: ItemConditionType;
  images: string[];
  sellerPhone?: string;
}
