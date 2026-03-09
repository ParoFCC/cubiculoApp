export interface Cubiculo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  is_active: boolean;
  games_enabled: boolean;
  printing_enabled: boolean;
  products_enabled: boolean;
  created_at: string;
}
