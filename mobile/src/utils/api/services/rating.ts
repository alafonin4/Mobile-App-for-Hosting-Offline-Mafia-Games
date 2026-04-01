import type { RequestFn } from '../core';
import type { RatingResponse, RatingScope } from '../types/rating';

export function getRating(request: RequestFn, scope: RatingScope) {
  return request<RatingResponse>(`/rating?scope=${scope}`);
}
