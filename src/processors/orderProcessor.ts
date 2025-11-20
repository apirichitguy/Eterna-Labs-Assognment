import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { MockDexRouter } from '../services/MockDexRouter';
import { WebsocketManager } from '../services/WebsocketManager';

// Support both REDIS_URL (Railway) and separate REDIS_HOST/REDIS_PORT (local)
const connection = process.env.REDIS_URL
    ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
    : new IORedis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
        maxRetriesPerRequest: null
    });

export { connection as orderProcessorConnection };

const workers: Worker[] = [];

export function startOrderWorker(wsManager: WebsocketManager) {
    const dex = new MockDexRouter();

    const worker = new Worker('orders', async (job: Job) => {
        const order = job.data;
        const id = order.id;

        // Delay to ensure WebSocket connection is fully established
        // This gives the client time to connect and subscribe
        await new Promise(resolve => setTimeout(resolve, 2000));

        wsManager.emit(id, { status: 'pending' });
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            wsManager.emit(id, { status: 'routing' });
            await new Promise(resolve => setTimeout(resolve, 800));

            const [r, m] = await Promise.all([
                dex.getRaydiumQuote(order.tokenIn, order.tokenOut, order.amountIn),
                dex.getMeteoraQuote(order.tokenIn, order.tokenOut, order.amountIn)
            ]);
            const chosen = r.price < m.price ? r : m;
            await new Promise(resolve => setTimeout(resolve, 800));
            wsManager.emit(id, { status: 'building', chosenDex: chosen.dex, quote: chosen });

            await new Promise(resolve => setTimeout(resolve, 800));
            wsManager.emit(id, { status: 'submitted', chosenDex: chosen.dex });
            const res = await dex.executeSwap(chosen.dex, order);
            wsManager.emit(id, { status: 'confirmed', txHash: res.txHash, executedPrice: res.executedPrice });
            return { txHash: res.txHash };
        } catch (err: any) {
            wsManager.emit(id, { status: 'failed', error: err.message || String(err) });
            throw err;
        }
    }, { connection, concurrency: 10 });

    worker.on('failed', (job, err) => {
        console.error('job failed', job?.id, err.message);
    });

    workers.push(worker);
    return worker;
}

export async function closeAllWorkers() {
    await Promise.all(workers.map(w => w.close()));
    workers.length = 0;
}
