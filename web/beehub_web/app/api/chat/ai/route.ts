import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

function loadEnvKey(name: string) {
  const envKey = process.env[name] || '';
  if (envKey) return envKey;

  const candidatePaths = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
  ];

  for (const envPath of candidatePaths) {
    try {
      const envText = fs.readFileSync(envPath, 'utf8');
      const match = envText.match(new RegExp(`(^|\\n)${name}=(.+)`));
      if (match?.[2]) {
        return match[2].trim().replace(/^['\"]|['\"]$/g, '');
      }
    } catch {
      // ignore
    }
  }

  return '';
}

const GEMINI_API_KEY = loadEnvKey('GEMINI_API_KEY');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const OPENAI_API_KEY = loadEnvKey('OPENAI_API_KEY');
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const GROQ_API_KEY = loadEnvKey('GROQ_API_KEY');
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const API_BASE_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000/api';

const AI_PROVIDER = (
  process.env.AI_PROVIDER ||
  (GEMINI_API_KEY ? 'gemini' : GROQ_API_KEY ? 'groq' : OPENAI_API_KEY ? 'openai' : 'fallback')
).toLowerCase();

type HistoryItem = {
  role: 'assistant' | 'user';
  content: string;
};

type ProviderPackage = {
  id: string;
  name: string;
  description?: string | null;
  service_type?: string;
  vehicle_size?: string;
  base_price: number;
  price_per_km?: number;
  price_per_floor?: number;
  helper_count?: number;
  includes_packing?: boolean;
  includes_insurance?: boolean;
};

type ProviderReview = {
  id: string;
  rating: number;
  comment?: string | null;
  tags?: string[];
  customer_name?: string;
};

type ProviderDetail = {
  id: string;
  name: string;
  business_name: string;
  full_name?: string | null;
  vehicle_type?: string | null;
  vehicle_plate?: string | null;
  base_price?: number | null;
  price_per_km?: number | null;
  price_per_floor?: number | null;
  rating: number;
  total_reviews: number;
  completed_trips?: number;
  service_area?: string[];
  packages?: ProviderPackage[];
  reviews?: ProviderReview[];
};

function formatVND(amount?: number | null) {
  if (amount == null || Number.isNaN(Number(amount))) return 'Liên hệ';
  return `${Number(amount).toLocaleString('vi-VN')}đ`;
}

function vehicleLabel(v?: string | null) {
  const map: Record<string, string> = {
    van: 'Xe Van (500kg)',
    small_truck: 'Xe tải nhỏ (1 tấn)',
    medium_truck: 'Xe tải vừa (1.5–2 tấn)',
    large_truck: 'Xe tải lớn (>2 tấn)',
    ba_gac: 'Xe ba gác / xe nhỏ',
  };
  if (!v) return 'Xe chuyển trọ';
  return map[v] || v;
}

export function isProviderQuestion(message: string): boolean {
  const q = message.toLowerCase();
  const keywords = [
    'so sánh',
    'nhà xe',
    'xe tải',
    'xe van',
    'gợi ý',
    'đánh giá',
    'review',
    'tài xế',
    'đối tác',
    'provider',
    'bảng giá',
    'giá mở cửa',
    'giá cước',
    'giá bao nhiêu',
    'rẻ nhất',
    'tốt nhất',
    'uy tín',
    'chọn nhà xe',
    'tư vấn nhà xe',
    'gói dịch vụ',
    'combo',
    'ghép đơn',
  ];
  return keywords.some((kw) => q.includes(kw));
}

async function fetchProvidersList(): Promise<ProviderDetail[]> {
  const urlsToTry = [
    `${API_BASE_URL.replace(/\/$/, '')}/providers/browse?limit=8`,
    'http://localhost:3000/api/providers/browse?limit=8',
  ];

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const json = await res.json();
      const rawList = Array.isArray(json?.data) ? json.data : [];
      if (rawList.length === 0) continue;

      const detailed = await Promise.all(
        rawList.slice(0, 8).map(async (item: Record<string, unknown>) => {
          const id = String(item.id || '');
          const baseUrl = url.split('/providers/browse')[0];
          try {
            const detailRes = await fetch(`${baseUrl}/providers/${id}?reviews_limit=20`, {
              cache: 'no-store',
            });
            if (detailRes.ok) {
              const detailJson = await detailRes.json();
              if (detailJson?.data) return detailJson.data as ProviderDetail;
            }
          } catch {
            // fallback to browse row
          }
          const profile = Array.isArray(item.profiles) ? item.profiles[0] : (item.profiles as Record<string, unknown> | undefined);
          const name = String(item.business_name || profile?.full_name || 'Nhà xe');
          return {
            id,
            name,
            business_name: name,
            full_name: (profile?.full_name as string) || null,
            vehicle_type: (item.vehicle_type as string) || null,
            vehicle_plate: (item.vehicle_plate as string) || null,
            base_price: item.base_price != null ? Number(item.base_price) : null,
            price_per_km: item.price_per_km != null ? Number(item.price_per_km) : null,
            price_per_floor: item.price_per_floor != null ? Number(item.price_per_floor) : null,
            rating: Number(item.rating || 0),
            total_reviews: Number(item.total_reviews || 0),
            completed_trips: Number(item.total_orders || 0),
            service_area: Array.isArray(item.service_area) ? (item.service_area as string[]) : [],
            packages: [],
            reviews: [],
          } satisfies ProviderDetail;
        }),
      );

      return detailed;
    } catch {
      // try next URL
    }
  }

  return [];
}

export async function getProviderContext(): Promise<{
  providers: ProviderDetail[];
  contextText: string;
}> {
  const providers = await fetchProvidersList();
  if (providers.length === 0) {
    return { providers: [], contextText: '' };
  }

  const lines = providers.map((p, idx) => {
    const areaText = p.service_area?.length ? p.service_area.join(', ') : 'Toàn TP. Đà Nẵng';
    const pkgLines = (p.packages || [])
      .slice(0, 4)
      .map(
        (pkg) =>
          `    * Gói "${pkg.name}": giá mở cửa ${formatVND(pkg.base_price)}, +${formatVND(pkg.price_per_km)}/km, ${pkg.helper_count || 0} người bốc xếp`,
      )
      .join('\n');
    const reviewLines = (p.reviews || [])
      .slice(0, 5)
      .map((r) => `    * (${r.rating}/5★) ${r.customer_name || 'Khách'}: "${r.comment || 'Dịch vụ tốt'}"`)
      .join('\n');

    return [
      `${idx + 1}. **${p.business_name || p.name}**`,
      `   - Loại xe: ${vehicleLabel(p.vehicle_type)} ${p.vehicle_plate ? `(${p.vehicle_plate})` : ''}`,
      `   - Giá mở cửa: ${formatVND(p.base_price)} | Giá mỗi km: ${formatVND(p.price_per_km)}/km | Phí tầng lầu: ${formatVND(p.price_per_floor)}/tầng`,
      `   - Đánh giá: ${Number(p.rating || 0).toFixed(1)}/5★ (${p.total_reviews || 0} đánh giá, ${p.completed_trips || 0} chuyến hoàn tất)`,
      `   - Khu vực hoạt động: ${areaText}`,
      pkgLines ? `   - Các gói dịch vụ:\n${pkgLines}` : '',
      reviewLines ? `   - Nhận xét gần đây:\n${reviewLines}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  });

  return {
    providers,
    contextText: `=== DANH SÁCH NHÀ XE ĐỐI TÁC TRÊN BEEHUB (DỮ LIỆU THỰC TẾ) ===\n${lines.join('\n\n')}`,
  };
}

export function makeSystemPrompt(providerContextText: string): string {
  return [
    'Bạn là Trợ lý AI thông minh của BeeHub — nền tảng chuyển trọ và chợ đồ cũ dành cho sinh viên tại Đà Nẵng.',
    'Nhiệm vụ của bạn:',
    '1. Tư vấn và hướng dẫn người dùng về đăng ký tài khoản, đăng nhập, đặt chuyến (Ghép đơn sinh viên tiết kiệm 25%, Gói Combo trọn gói 1 xe riêng, Chuyến báo giá thông thường), thanh toán đặt cọc 30% qua PayOS, theo dõi đơn hàng trực tuyến và Chợ sinh viên (Pass đồ).',
    '2. Khi người dùng hỏi về nhà xe, bảng giá, so sánh hoặc gợi ý đối tác vận chuyển: Hãy phân tích và so sánh trực tiếp dựa trên dữ liệu thực tế bên dưới (giá mở cửa `base_price`, giá theo km `price_per_km`, các gói dịch vụ `packages`, điểm đánh giá `rating`, số lượt đánh giá `total_reviews`, loại xe và khu vực hoạt động).',
    '3. Trình bày câu trả lời bằng tiếng Việt thân thiện, rõ ràng, chuyên nghiệp, sử dụng định dạng Markdown (`**in đậm**`, danh sách `-` hoặc `1. 2. 3.`) để sinh viên dễ đọc và dễ so sánh.',
    '4. Nếu câu hỏi hoàn toàn không liên quan đến BeeHub, chuyển trọ hoặc sinh viên, hãy lịch sự trả lời: "Mình là trợ lý BeeHub, mình chỉ hỗ trợ tư vấn chuyển trọ, so sánh nhà xe và các dịch vụ trên BeeHub nhé!"',
    providerContextText ? `\n${providerContextText}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildProviderComparisonFallback(message: string, providers: ProviderDetail[]): string {
  if (providers.length === 0) {
    return [
      '### Tư vấn chọn hình thức & nhà xe trên BeeHub',
      'Hiện tại trên **BeeHub** bạn có thể lựa chọn 3 hình thức chuyển trọ tối ưu:',
      '1. **Ghép đơn sinh viên (Tiết kiệm 25%):** Hệ thống tự động ghép với bạn cùng tuyến đường và ngày chuyển, cọc và thanh toán riêng từng người.',
      '2. **Gói Combo trọn gói:** Biết giá cố định ngay (từ **400.000đ**), bao gồm xe vận chuyển + người khuân vác.',
      '3. **Chuyến báo giá thông thường:** Gửi yêu cầu để các nhà xe uy tín gửi báo giá cạnh tranh và bạn tự chọn đối tác ưng ý.',
      '- Bạn có thể vào mục **Nhà xe** (`/nha-xe`) hoặc **Đặt chuyến** (`/dat-chuyen`) để xem chi tiết từng đối tác nhé!',
    ].join('\n');
  }

  const sortedByRating = [...providers].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const sortedByPrice = [...providers]
    .filter((p) => p.base_price != null && p.base_price > 0)
    .sort((a, b) => Number(a.base_price) - Number(b.base_price));

  const topList = sortedByRating.slice(0, 5).map((p, i) => {
    const pkgInfo =
      p.packages && p.packages.length > 0
        ? ` | Gói nổi bật: **${p.packages[0].name}** (${formatVND(p.packages[0].base_price)})`
        : '';
    return `${i + 1}. **${p.business_name || p.name}** — **${Number(p.rating || 0).toFixed(1)}★** (${p.total_reviews || 0} đánh giá) | ${vehicleLabel(p.vehicle_type)} | Giá mở cửa: **${formatVND(p.base_price)}**, **${formatVND(p.price_per_km)}/km**${pkgInfo}`;
  });

  const bestRated = sortedByRating[0];
  const cheapest = sortedByPrice[0];

  const recommendations: string[] = [];
  if (bestRated) {
    recommendations.push(
      `- **Đánh giá cao nhất:** **${bestRated.business_name || bestRated.name}** (${Number(bestRated.rating || 0).toFixed(1)}★ với ${bestRated.total_reviews || 0} lượt nhận xét, ${bestRated.completed_trips || 0} chuyến hoàn tất).`,
    );
  }
  if (cheapest) {
    recommendations.push(
      `- **Giá mở cửa tiết kiệm nhất:** **${cheapest.business_name || cheapest.name}** (chỉ từ **${formatVND(cheapest.base_price)}**, +**${formatVND(cheapest.price_per_km)}/km**).`,
    );
  }
  recommendations.push(
    '- **Mẹo tiết kiệm cho sinh viên:** Chọn hình thức **Ghép đơn sinh viên** tại `/dat-chuyen` để được **giảm ngay 25% cước phí**!',
  );

  return [
    '### So sánh bảng giá & đánh giá các nhà xe BeeHub',
    ...topList,
    '### Gợi ý nhanh cho bạn',
    ...recommendations,
  ].join('\n');
}

function getAssistantReply(message: string, providers: ProviderDetail[] = []) {
  const normalized = message.toLowerCase();

  if (isProviderQuestion(normalized)) {
    return buildProviderComparisonFallback(message, providers);
  }

  if (
    normalized.includes('đăng ký') ||
    normalized.includes('đăng kí') ||
    normalized.includes('tạo tài khoản') ||
    normalized.includes('tài khoản') ||
    normalized.includes('register') ||
    normalized.includes('create account')
  ) {
    return 'Để **đăng ký tài khoản** trên BeeHub:\n1. Truy cập trang **Đăng ký** (`/dang-ky`).\n2. Chọn vai trò phù hợp (**Sinh viên / Khách hàng** hoặc **Đối tác nhà xe**).\n3. Điền họ tên, email, số điện thoại, mật khẩu và hoàn tất xác nhận.';
  }

  if (
    normalized.includes('đăng nhập') ||
    normalized.includes('login') ||
    normalized.includes('sign in') ||
    normalized.includes('masuk')
  ) {
    return 'Để **đăng nhập**, bạn mở trang `/dang-nhap`, nhập email và mật khẩu đã đăng ký (hoặc đăng nhập nhanh bằng **Google**). Nếu quên mật khẩu, bạn có thể nhấn vào **Quên mật khẩu** để đặt lại.';
  }

  if (
    normalized.includes('cách sử dụng') ||
    normalized.includes('hướng dẫn') ||
    normalized.includes('sử dụng web') ||
    normalized.includes('sử dụng website') ||
    normalized.includes('bắt đầu') ||
    normalized.includes('web')
  ) {
    return '### Hướng dẫn sử dụng BeeHub nhanh chóng\n1. **Đặt chuyến chuyển trọ (`/dat-chuyen`):** Chọn **Ghép đơn (-25%)**, **Gói Combo riêng** hoặc **Nhận báo giá**.\n2. **Thanh toán an toàn:** Đặt cọc **30%** qua cổng **PayOS**, phần còn lại thanh toán khi hoàn tất.\n3. **Theo dõi trực tuyến (`/don-hang`):** Xem vị trí tài xế realtime và nhắn tin trực tiếp với nhà xe.\n4. **Chợ sinh viên (`/cho-sinh-vien`):** Mua bán, thanh lý đồ cũ sinh viên nhanh chóng.';
  }

  if (
    normalized.includes('đặt dịch vụ') ||
    normalized.includes('đặt chuyến') ||
    normalized.includes('đặt xe') ||
    normalized.includes('đặt đơn') ||
    normalized.includes('booking') ||
    normalized.includes('book')
  ) {
    return 'Để **đặt chuyến chuyển trọ**, bạn vào mục **Đặt chuyến** (`/dat-chuyen`):\n- **Ghép đơn sinh viên:** Giảm ngay **25% cước phí**, tự động ghép cùng bạn cùng tuyến & ngày.\n- **Gói Combo riêng:** Biết giá cố định ngay, 1 mình 1 xe riêng biệt.\n- **Chuyến thông thường:** Nhận báo giá từ nhiều nhà xe và tự chọn mức giá ưng ý.';
  }

  if (
    normalized.includes('thanh toán') ||
    normalized.includes('pay') ||
    normalized.includes('cổng thanh toán') ||
    normalized.includes('đặt cọc')
  ) {
    return 'BeeHub hỗ trợ thanh toán minh bạch và an toàn:\n- **Đặt cọc 30%** qua cổng thanh toán **PayOS** (quét mã VietQR ngân hàng) để giữ lịch xe.\n- **70% còn lại** thanh toán sau khi nhà xe giao đồ hoàn tất.\n- Hoàn tiền cọc tự động theo chính sách nếu hủy đơn sớm.';
  }

  if (
    normalized.includes('theo dõi') ||
    normalized.includes('tracking') ||
    normalized.includes('đơn hàng') ||
    normalized.includes('order') ||
    normalized.includes('trạng thái')
  ) {
    return 'Bạn có thể xem trạng thái đơn hàng và theo dõi vị trí xe trực tiếp trên bản đồ trong mục **Đơn hàng** (`/don-hang`) hoặc **Hoạt động** (`/hoat-dong`).';
  }

  if (
    normalized.includes('hồ sơ') ||
    normalized.includes('profile') ||
    normalized.includes('thông tin cá nhân') ||
    normalized.includes('cập nhật')
  ) {
    return 'Bạn có thể quản lý hồ sơ cá nhân, cập nhật số điện thoại, ảnh đại diện và đổi mật khẩu trong mục **Tài khoản** (`/tai-khoan`).';
  }

  if (
    normalized.includes('nhà cung cấp') ||
    normalized.includes('provider') ||
    normalized.includes('tài xế') ||
    normalized.includes('driver')
  ) {
    return 'Nếu bạn là **nhà xe / tài xế**, bạn có thể đăng ký tại `/dang-ky-tai-xe`, tải lên giấy tờ xác minh (CCCD, bằng lái, đăng ký xe) và nhận đơn chuyển trọ hoặc chuyến ghép sinh viên tại `/tai-xe/tong-quan`.';
  }

  if (
    normalized.includes('khách hàng') ||
    normalized.includes('customer') ||
    normalized.includes('sinh viên')
  ) {
    return 'Nếu bạn là **sinh viên / khách hàng**, bạn có thể đặt chuyến chuyển trọ riêng hoặc **ghép đơn tiết kiệm 25%**, so sánh giá các nhà xe và mua bán đồ trọ tại **Chợ sinh viên** (`/cho-sinh-vien`).';
  }

  if (
    normalized.includes('giới thiệu') ||
    normalized.includes('website') ||
    normalized.includes('beehub') ||
    normalized.includes('unimove') ||
    normalized.includes('chức năng') ||
    normalized.includes('là gì')
  ) {
    return '**BeeHub** là nền tảng chuyển trọ thông minh & chợ đồ cũ dành cho sinh viên Đà Nẵng, giúp kết nối sinh viên với các nhà xe uy tín, hỗ trợ **ghép đơn tiết kiệm 25%**, đặt cọc an toàn qua PayOS và theo dõi lộ trình trực tuyến.';
  }

  return 'Xin chào! Mình là trợ lý **BeeHub**. Bạn có thể hỏi mình về:\n- **So sánh giá & đánh giá các nhà xe**\n- **Đặt chuyến chuyển trọ & Ghép đơn sinh viên (-25%)**\n- **Thanh toán đặt cọc PayOS & Theo dõi đơn hàng**\n- **Cách đăng ký / đăng nhập tài khoản**';
}

async function getGeminiReply(systemPrompt: string, message: string, history: HistoryItem[]) {
  if (!GEMINI_API_KEY) return null;

  try {
    const contents = [
      ...history.slice(-8).map((item) => ({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.content }],
      })),
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 700,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini Chat] API error', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (error) {
    console.error('[Gemini Chat] request failed', error);
    return null;
  }
}

async function getOpenAiReply(systemPrompt: string, message: string, history: HistoryItem[]) {
  if (!OPENAI_API_KEY) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-8).map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: message },
        ],
        temperature: 0.5,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAI] API error', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('[OpenAI] request failed', error);
    return null;
  }
}

async function getGroqReply(systemPrompt: string, message: string, history: HistoryItem[]) {
  if (!GROQ_API_KEY) return null;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-8).map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: message },
        ],
        temperature: 0.5,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Groq] API error', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('[Groq] request failed', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const rawHistory = Array.isArray(body?.history) ? body.history : [];
  const history: HistoryItem[] = rawHistory
    .filter(
      (item: unknown): item is HistoryItem =>
        Boolean(item) &&
        typeof item === 'object' &&
        ((item as HistoryItem).role === 'user' || (item as HistoryItem).role === 'assistant') &&
        typeof (item as HistoryItem).content === 'string',
    )
    .slice(-8);

  if (!message) {
    return NextResponse.json({ error: 'Vui lòng nhập nội dung câu hỏi.' }, { status: 400 });
  }

  const needsProviderContext =
    isProviderQuestion(message) ||
    history.some((h) => isProviderQuestion(h.content)) ||
    Boolean(GEMINI_API_KEY || GROQ_API_KEY || OPENAI_API_KEY);

  const { providers, contextText } = needsProviderContext
    ? await getProviderContext()
    : { providers: [], contextText: '' };

  const systemPrompt = makeSystemPrompt(contextText);

  let reply: string | null = null;

  if (AI_PROVIDER === 'gemini' || GEMINI_API_KEY) {
    reply = await getGeminiReply(systemPrompt, message, history);
  }
  if (!reply && (AI_PROVIDER === 'groq' || GROQ_API_KEY)) {
    reply = await getGroqReply(systemPrompt, message, history);
  }
  if (!reply && (AI_PROVIDER === 'openai' || OPENAI_API_KEY)) {
    reply = await getOpenAiReply(systemPrompt, message, history);
  }
  if (!reply) {
    reply = getAssistantReply(message, providers);
  }

  return NextResponse.json({
    reply,
    debug: {
      provider: AI_PROVIDER,
      geminiKey: Boolean(GEMINI_API_KEY),
      groqKey: Boolean(GROQ_API_KEY),
      openAiKey: Boolean(OPENAI_API_KEY),
      providersLoaded: providers.length,
    },
  });
}
