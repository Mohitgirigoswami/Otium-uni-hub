export interface LostItemFilters {
  status?: string;
  search?: string;
  category?: string;
}

export interface CreateLostItemParams {
  finderId: string;
  title: string;
  description: string;
  locationFound: string;
  dateFound: string;
  imageUrl: string;
  category?: string;
}
