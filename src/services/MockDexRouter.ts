import { sleep } from '../utils';

export interface Quote { price: number; fee: number; dex: string; liquidity?: number; }

export class MockDexRouter {
  basePrice = 100;

  async getRaydiumQuote(tokenIn: string, tokenOut: string, amount: number): Promise<Quote> {
    await sleep(150 + Math.random() * 200);
    const price = this.basePrice * (0.98 + Math.random() * 0.04);
    return { price, fee: 0.003, dex: 'raydium', liquidity: 100000 };
  }

  async getMeteoraQuote(tokenIn: string, tokenOut: string, amount: number): Promise<Quote> {
    await sleep(150 + Math.random() * 200);
    const price = this.basePrice * (0.97 + Math.random() * 0.05);
    return { price, fee: 0.002, dex: 'meteora', liquidity: 80000 };
  }

  async executeSwap(dex: string, order: any): Promise<{ txHash: string; executedPrice: number }> {
    await sleep(2000 + Math.random() * 1000);
    if (Math.random() < 0.08) throw new Error('simulated-chain-error');
    const executedPrice = this.basePrice * (0.98 + Math.random() * 0.04);
    return { txHash: `MOCKTX_${Date.now().toString(36)}`, executedPrice };
  }
}
