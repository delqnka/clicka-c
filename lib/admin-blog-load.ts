import { loadAdminBlogPosts, loadSalonBlogTitle } from '@/lib/salon-blog';
import type { AdminSalonBlogPost } from '@/lib/salon-blog-shared';

export async function loadAdminBlogDataBySalonId(
  salonId: string,
): Promise<{ posts: AdminSalonBlogPost[]; blogTitle: string }> {
  const [posts, blogTitle] = await Promise.all([
    loadAdminBlogPosts(salonId),
    loadSalonBlogTitle(salonId),
  ]);
  return { posts, blogTitle };
}
