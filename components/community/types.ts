export type PublicOptimization = {
  id: string;
  user_id: string;
  file_name: string;
  original_size: number;
  compressed_size: number;
  file_type: string;
  created_at: string;
  preview_url: string;
  views: number;
  likes: number;
  shares: number;
  creator_name: string;
  creator_is_pro: boolean;
  popularity_score: number;
  fileTypeLabel?: string;
};
