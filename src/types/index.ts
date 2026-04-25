export type UserRole = 'artist' | 'client' | 'admin';
export interface RouteConfig {
  path: string;
  element: React.ReactNode;
}

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type ArtworkType = 'digital' | 'handdrawn';
export type CommissionStatus = 
  | 'pending_agreement'
  | 'agreed'
  | 'deposit_paid'
  | 'sketch_uploaded'
  | 'final_uploaded'
  | 'completed'
  | 'reported'
  | 'refunded';

export interface Profile {
  id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  role: UserRole;
  verification_status: VerificationStatus;
  verification_feedback: string | null;
  bio: string | null;
  style_preference: ArtworkType | null;
  artist_tags: string[];
  created_at: string;
  updated_at: string;
}

// 画师风格标签定义
export interface ArtistTag {
  key: string;
  zh: string;
  en: string;
  category: 'handdrawn' | 'digital';
}

export const ARTIST_TAGS: ArtistTag[] = [
  { key: '丙烯', zh: '丙烯', en: 'Acrylic', category: 'handdrawn' },
  { key: '水粉/水彩', zh: '水粉/水彩', en: 'Watercolor', category: 'handdrawn' },
  { key: '铅笔', zh: '铅笔', en: 'Pencil', category: 'handdrawn' },
  { key: '素描', zh: '素描', en: 'Sketch', category: 'handdrawn' },
  { key: '厚涂', zh: '厚涂', en: 'Oil Paint Style', category: 'digital' },
  { key: '平涂', zh: '平涂', en: 'Flat Color', category: 'digital' },
];

/** 根据当前语言翻译画师标签 */
export function translateTag(key: string, language: 'zh' | 'en'): string {
  const tag = ARTIST_TAGS.find(t => t.key === key);
  if (!tag) return key;
  return language === 'en' ? tag.en : tag.zh;
}

/** 根据已选标签推断 style_preference */
export function inferStylePreference(tags: string[]): ArtworkType {
  const hasDigital = tags.some(k => ARTIST_TAGS.find(t => t.key === k)?.category === 'digital');
  const hasHanddrawn = tags.some(k => ARTIST_TAGS.find(t => t.key === k)?.category === 'handdrawn');
  if (hasDigital && !hasHanddrawn) return 'digital';
  if (hasHanddrawn && !hasDigital) return 'handdrawn';
  return 'digital'; // 混合默认板绘
}

export interface Artwork {
  id: string;
  artist_id: string;
  title: string;
  image_url: string;
  type: ArtworkType;
  is_for_verification: boolean;
  created_at: string;
}

export interface Commission {
  id: string;
  client_id: string;
  artist_id: string;
  description: string;
  sketch_deadline: string | null;
  final_deadline: string;
  price: number;
  deposit: number;
  status: CommissionStatus;
  sketch_url: string | null;
  final_url: string | null;
  wechat_pay_url: string | null;
  created_at: string;
  updated_at: string;
  // Join data
  client?: Profile;
  artist?: Profile;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  commission_id: string | null;
  is_read: boolean;
  created_at: string;
  // Join data
  sender?: Profile;
  receiver?: Profile;
}

export interface Report {
  id: string;
  commission_id: string;
  reporter_id: string;
  reported_artist_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  processed_at: string | null;
}

export interface Post {
  id: string;
  author_id: string;
  title: string;
  content: string;
  image_urls: string[];
  created_at: string;
  author?: Profile;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: Profile;
}
