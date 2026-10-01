import { ItemConditionType, MarketplaceCategoryType } from "@/lib/types";

export interface MarketplaceFilters {
  category?: string;
  condition?: string;
  status?: string;
  search?: string;
  collegeId?: string | null;
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
  collegeId?: string | null;
}
