import { orderQueue } from '../queue/orderQueue';
import { v4 as uuidv4 } from 'uuid';
import { WebsocketManager } from './WebsocketManager';
import { Order } from '../types';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export class OrderService {
  constructor(private wsManager: WebsocketManager) { }

  async createOrderAndEnqueue(order: Partial<Order>, wsConn?: any) {
    const id = order.id || uuidv4();
    const o: Order = {
      id,
      userId: order.userId || 'anon',
      type: order.type || 'market',
      tokenIn: order.tokenIn!,
      tokenOut: order.tokenOut!,
      amountIn: order.amountIn!,
      createdAt: new Date().toISOString(),
      attempts: 0
    };

    // persist to DB (best-effort)
    try {
      await pool.query(
        `INSERT INTO orders(id, user_id, type, token_in, token_out, amount_in, status, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [o.id, o.userId, o.type, o.tokenIn, o.tokenOut, o.amountIn, 'pending', o.createdAt]
      );
    } catch (err) {
      // ignore DB errors for the mock (but log)
      console.error('db insert failed', err);
    }

    if (wsConn) {
      this.wsManager.attach(wsConn, id);
    }
    await orderQueue.add('execute', o, { jobId: id });
    return id;
  }
}
