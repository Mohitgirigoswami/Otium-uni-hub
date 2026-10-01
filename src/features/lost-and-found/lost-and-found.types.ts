export interface LostItemFilters {
  status?: string;
  search?: string;
  category?: string;
  collegeId?: string | null;
}

export interface CreateLostItemParams {
  finderId: string;
  title: string;
  description: string;
  locationFound: string;
  dateFound: string;
  imageUrl: string;
  category?: string;
  collegeId?: string | null;
}
