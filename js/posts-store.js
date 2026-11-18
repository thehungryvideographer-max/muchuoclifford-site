/* ============================================================
   POSTS STORE — merges built-in posts (blog-data.js) with posts
   created in the admin panel (saved in this browser's storage).
   ============================================================ */
function getCustomPosts() {
  try { return JSON.parse(localStorage.getItem('thv_custom_posts') || '[]'); }
  catch (e) { return []; }
}
function saveCustomPosts(arr) {
  localStorage.setItem('thv_custom_posts', JSON.stringify(arr));
}
function getAllPosts() {
  return [...getCustomPosts(), ...(typeof POSTS !== 'undefined' ? POSTS : [])];
}
/* auto excerpt from body when missing */
function postExcerpt(p) {
  if (p.excerpt) return p.excerpt;
  const text = String(p.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 150) + (text.length > 150 ? '…' : '');
}
/* video platform helper: returns {iframe, platform} or null */
function videoEmbed(url) {
  if (!url) return null;
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/);
  if (m) return { iframe: 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0', platform: 'YouTube' };
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return { iframe: 'https://player.vimeo.com/video/' + m[1], platform: 'Vimeo' };
  return null;
}
function platformName(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch (e) { return 'the platform'; }
}
