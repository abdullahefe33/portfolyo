// /api/admin/* altındaki her uç için oturum, Origin ve CSRF denetimi (sunucu tarafında).
import { handler } from '../../../lib/http.js';
import { requireAdmin } from '../../../lib/auth.js';

export const onRequest = [
  handler(async (context) => {
    await requireAdmin(context);
    return context.next();
  }),
];
