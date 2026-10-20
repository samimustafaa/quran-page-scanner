import type {ScanResponse} from './types';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
export async function scanImage(uri: string): Promise<ScanResponse> {
  if (!API_URL) throw new Error('Skaneri duhet të lidhet me shërbimin e njohjes. Deri atëherë, hape përkthimin me numrin e faqes.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const form = new FormData();
    if (uri.startsWith('blob:') || uri.startsWith('data:')) {
      const blob = await (await fetch(uri)).blob();
      form.append('image', blob, 'page.jpg');
    } else {
      form.append('image', {uri, name: 'page.jpg', type: 'image/jpeg'} as unknown as Blob);
    }
    const response = await fetch(`${API_URL}/v1/scan`, {method: 'POST', body: form, signal: controller.signal});
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Skanimi dështoi. Provo përsëri.');
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Skanimi zgjati shumë. Kontrollo internetin dhe provo përsëri.');
    throw error;
  } finally { clearTimeout(timer); }
}
