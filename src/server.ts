import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { v4 as uuidv4 } from 'uuid';
import { OrderService } from './services/OrderService';
import { WebsocketManager } from './services/WebsocketManager';
import { startOrderWorker } from './processors/orderProcessor';
import { Order } from './types';
import fs from 'fs';
import path from 'path';

const fastify = Fastify({ logger: true });

fastify.register(cors, {
  origin: true,
  credentials: true
});

fastify.register(websocketPlugin, {
  options: {
    maxPayload: 1048576
  }
});

// Swagger/OpenAPI Documentation - register BEFORE routes but UI AFTER
fastify.register(swagger, {
  openapi: {
    info: {
      title: 'EternaLabs Order Execution Engine API',
      description: 'REST API for DEX order routing with real-time WebSocket updates. Intelligently routes orders between Raydium and Meteora protocols based on best execution price.',
      version: '1.0.0',
      contact: {
        name: 'Sanyam Barwar',
        email: 'sanyam22447@iiitd.ac.in',
        url: 'https://github.com/SanyamBK/EternaLabs'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server'
      },
      {
        url: 'https://eternalabs-production.up.railway.app',
        description: 'Production server (Railway)'
      }
    ],
    tags: [
      { name: 'Orders', description: 'Order execution endpoints' },
      { name: 'Health', description: 'Health check endpoints' }
    ]
  }
});

const wsManager = new WebsocketManager();
const orderService = new OrderService(wsManager);

// start worker
startOrderWorker(wsManager);

// Root endpoint with API info
fastify.get('/', {
  schema: {
    tags: ['Health'],
    summary: 'API Information',
    description: 'Returns basic information about the API and available endpoints',
    response: {
      200: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          version: { type: 'string' },
          status: { type: 'string' },
          endpoints: { type: 'object' },
          docs: { type: 'string' },
          apiDocs: { type: 'string' },
          deployment: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  return {
    name: 'EternaLabs Order Execution Engine',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      'POST /api/orders/execute': 'Submit a new order',
      'GET /api/orders/execute (WebSocket)': 'Subscribe to order updates',
      'GET /health': 'Health check',
      'GET /demo': 'Interactive demo UI'
    },
    docs: 'https://github.com/SanyamBK/EternaLabs',
    apiDocs: '/documentation',
    deployment: 'Railway'
  };
});

// Health check endpoint
fastify.get('/health', {
  schema: {
    tags: ['Health'],
    summary: 'Health Check',
    description: 'Returns the health status of the API server',
    response: {
      200: {
        type: 'object',
        properties: {
          status: {
            type: 'string'
          },
          timestamp: {
            type: 'string'
          }
        }
      }
    }
  }
}, async (request, reply) => {
  return { status: 'healthy', timestamp: new Date().toISOString() };
});

// Demo UI endpoint
fastify.get('/demo', async (request, reply) => {
  const htmlPath = path.join(__dirname, '..', 'public', 'demo.html');
  try {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    reply.type('text/html').send(html);
  } catch (error) {
    reply.code(404).send({ error: 'Demo page not found. Use the test-client-railway.html file locally.' });
  }
});

// HTTP POST endpoint for order submission
fastify.post('/api/orders/execute', {
  schema: {
    tags: ['Orders'],
    summary: 'Submit a new order for execution',
    description: 'Creates a new market order and queues it for execution. The order will be routed to the best DEX (Raydium or Meteora) based on price comparison. Returns an order ID that can be used to subscribe to real-time updates via WebSocket.',
    body: {
      type: 'object',
      required: ['tokenIn', 'tokenOut', 'amountIn'],
      properties: {
        userId: {
          type: 'string',
          description: 'User identifier (optional, defaults to anon)'
        },
        type: {
          type: 'string',
          description: 'Order type (currently only market is supported)',
          enum: ['market'],
          default: 'market'
        },
        tokenIn: {
          type: 'string',
          description: 'Input token symbol (e.g., SOL, ETH, BTC)'
        },
        tokenOut: {
          type: 'string',
          description: 'Output token symbol (e.g., USDC, USDT)'
        },
        amountIn: {
          type: 'number',
          description: 'Amount of input token to swap',
          minimum: 0.001
        }
      }
    },
    response: {
      202: {
        description: 'Order accepted and queued for processing',
        type: 'object',
        properties: {
          orderId: {
            type: 'string',
            description: 'Unique order identifier (UUID)'
          },
          ws: {
            type: 'string',
            description: 'WebSocket endpoint path for order updates'
          }
        }
      },
      400: {
        description: 'Invalid request - missing required fields',
        type: 'object',
        properties: {
          error: {
            type: 'string'
          }
        }
      }
    }
  }
}, async (request, reply) => {
  const body = request.body as any;
  if (!body || !body.tokenIn || !body.tokenOut || !body.amountIn) {
    return reply.code(400).send({ error: 'missing required fields: tokenIn, tokenOut, amountIn' });
  }
  const orderId = uuidv4();
  const order: Order = {
    id: orderId,
    userId: body.userId || 'anon',
    type: body.type || 'market',
    tokenIn: body.tokenIn,
    tokenOut: body.tokenOut,
    amountIn: body.amountIn,
    createdAt: new Date().toISOString(),
    attempts: 0
  };
  await orderService.createOrderAndEnqueue(order);
  return reply.code(202).send({ orderId, ws: `/api/orders/execute` });
});

// WebSocket endpoint for real-time updates (must be in separate plugin for @fastify/websocket)
fastify.register(async function (fastify) {
  fastify.get('/api/orders/execute', {
    websocket: true,
    schema: {
      hide: true  // Hide from Swagger since WebSocket isn't well supported in OpenAPI
    }
  }, (connection, req) => {
    // Attach immediately if orderId is in query string
    const orderId = (req.query as any)?.orderId;
    if (orderId) {
      wsManager.attach(connection, orderId);
      connection.send(JSON.stringify({ subscribed: orderId }));
    }

    connection.on('message', async (msg: Buffer) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data && data.order) {
          const id = await orderService.createOrderAndEnqueue(data.order as Order, connection);
          connection.send(JSON.stringify({ orderId: id }));
        } else if (data && data.subscribeOrderId) {
          // Socket already attached from query string, just acknowledge
          if (!orderId || orderId !== data.subscribeOrderId) {
            wsManager.attach(connection, data.subscribeOrderId);
            connection.send(JSON.stringify({ subscribed: data.subscribeOrderId }));
          }
        } else {
          connection.send(JSON.stringify({ error: 'invalid payload' }));
        }
      } catch (err) {
        connection.send(JSON.stringify({ error: 'invalid payload' }));
      }
    });
  });
});

// Register Swagger UI AFTER all routes are defined
fastify.register(swaggerUi, {
  routePrefix: '/documentation',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true
  },
  staticCSP: true
});

const start = async () => {
  try {
    // Wait for all plugins to be registered
    await fastify.ready();

    await fastify.listen({ port: process.env.PORT ? Number(process.env.PORT) : 3000, host: '0.0.0.0' });
    fastify.log.info('server started');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
