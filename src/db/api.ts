import { supabase } from './supabase';
import { 
  Profile, Artwork, Commission, Message, Report, Post, Comment, 
  VerificationStatus, CommissionStatus, ArtworkType, UserRole 
} from '@/types';

import { compressImage } from '@/lib/utils';

export const api = {
  // Profiles
  async getProfile(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return { data: data as Profile | null, error };
  },

  async updateProfile(id: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as Profile | null, error };
  },

  async getArtists(style?: ArtworkType) {
    let query = supabase
      .from('profiles')
      .select('*, artworks(*)')
      .eq('role', 'artist')
      .eq('verification_status', 'verified');
    
    if (style) {
      query = query.eq('style_preference', style);
    }
    
    const { data, error } = await query;
    return { data: (data || []) as (Profile & { artworks: Artwork[] })[], error };
  },

  // Artworks
  async uploadArtwork(artist_id: string, file: File, title: string, type: ArtworkType, is_for_verification = false) {
    try {
      // 在前端进行压缩处理
      const processedFile = await compressImage(file);
      const fileExt = processedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `artworks/${artist_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('puredraw_images')
        .upload(filePath, processedFile);

      if (uploadError) return { error: uploadError };

      const { data: { publicUrl } } = supabase.storage
        .from('puredraw_images')
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from('artworks')
        .insert({
          artist_id,
          title,
          image_url: publicUrl,
          type,
          is_for_verification
        })
        .select()
        .single();

      return { data: data as Artwork, error };
    } catch (err: any) {
      return { error: err };
    }
  },

  async getArtworks(artist_id: string) {
    const { data, error } = await supabase
      .from('artworks')
      .select('*')
      .eq('artist_id', artist_id)
      .order('created_at', { ascending: false });
    return { data: (data || []) as Artwork[], error };
  },

  async createArtwork(artwork: Omit<Artwork, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('artworks')
      .insert(artwork)
      .select()
      .single();
    return { data: data as Artwork, error };
  },

  // Commissions
  async createCommission(commission: Omit<Commission, 'id' | 'created_at' | 'updated_at' | 'status' | 'sketch_url' | 'final_url' | 'wechat_pay_url'>) {
    const { data, error } = await supabase
      .from('commissions')
      .insert({
        ...commission,
        status: 'pending_agreement'
      })
      .select()
      .single();
    return { data: data as Commission, error };
  },

  async updateCommissionStatus(id: string, status: CommissionStatus, updates?: Partial<Commission>) {
    const { data, error } = await supabase
      .from('commissions')
      .update({ status, ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data: data as Commission, error };
  },

  async getCommissions(userId: string, role: UserRole) {
    const field = role === 'artist' ? 'artist_id' : 'client_id';
    const otherField = role === 'artist' ? 'client_id' : 'artist_id';
    const { data, error } = await supabase
      .from('commissions')
      .select(`
        *,
        client:profiles!commissions_client_id_fkey(*),
        artist:profiles!commissions_artist_id_fkey(*)
      `)
      .eq(field, userId)
      .order('updated_at', { ascending: false });
    return { data: (data || []) as Commission[], error };
  },

  // Messages
  async sendMessage(sender_id: string, receiver_id: string, content: string, commission_id?: string) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id,
        receiver_id,
        content,
        commission_id
      })
      .select()
      .single();
    return { data: data as Message, error };
  },

  async getChatMessages(user1: string, user2: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user1},receiver_id.eq.${user2}),and(sender_id.eq.${user2},receiver_id.eq.${user1})`)
      .order('created_at', { ascending: true });
    return { data: (data || []) as Message[], error };
  },

  async getRecentChats(userId: string) {
    // This is a bit complex in Supabase, but we can fetch recent messages and group them in JS
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*),
        receiver:profiles!messages_receiver_id_fkey(*)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    
    if (error) return { error };
    
    const chatsMap = new Map();
    data.forEach(msg => {
      const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;
      if (!chatsMap.has(otherUser.id)) {
        chatsMap.set(otherUser.id, {
          user: otherUser,
          lastMessage: msg
        });
      }
    });
    
    return { data: Array.from(chatsMap.values()), error: null };
  },

  // Posts
  async createPost(post: Omit<Post, 'id' | 'created_at' | 'author'>) {
    const { data, error } = await supabase
      .from('posts')
      .insert(post)
      .select()
      .single();
    return { data: data as Post, error };
  },

  async getPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*, author:profiles(*)')
      .order('created_at', { ascending: false });
    return { data: (data || []) as Post[], error };
  },

  // Verification (Admin)
  async getPendingVerifications() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, artworks(*)')
      .eq('verification_status', 'pending');
    return { data, error };
  }
};
