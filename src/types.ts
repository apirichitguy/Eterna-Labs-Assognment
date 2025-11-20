export type OrderType = 'market' | 'limit' | 'sniper';

export interface Order {
  id: string;
  userId: string;
  type: OrderType;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  limitPrice?: number;
  createdAt: string;
  attempts?: number;
}

export type OrderStatus = 'pending'|'routing'|'building'|'submitted'|'confirmed'|'failed';
