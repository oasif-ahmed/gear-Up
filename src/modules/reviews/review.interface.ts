export interface ICreateReview {
  gearItemId: string;
  rating: number;
  comment?: string;
}

export interface IUpdateReview {
  rating?: number;
  comment?: string;
}
