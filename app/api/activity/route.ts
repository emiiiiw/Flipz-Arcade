import { apiError, apiSuccess } from "@/lib/apiJson";
import { getPublicFeed } from "@/server/services/activityFeed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getPublicFeed(40);
    return apiSuccess({ items, feed: items });
  } catch (e) {
    console.error("[api/activity]", e);
    return apiSuccess({ items: [], feed: [] });
  }
}
