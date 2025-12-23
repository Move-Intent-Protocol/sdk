import fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { RelayerService } from './services/Relayer';
import chalk from 'chalk';

dotenv.config();

const server = fastify();
server.register(cors, {
    origin: true
});
const relayer = new RelayerService();

server.get('/health', async (request, reply) => {
    const balances = await relayer.getAllBalances();
    return {
        status: 'ok',
        address: (relayer as any).account.accountAddress.toString(),
        balances: balances
    };
});
server.get('/activity', async (request, reply) => {
    return { orders: relayer.orderHistory };
});


server.post('/intents', async (request, reply) => {
    const body: any = request.body;
    // schema: { intent: {...}, signature: "0x...", publicKey: "0x...", signingNonce: "0x..." }

    if (!body.intent || !body.signature || !body.publicKey || !body.signingNonce) {
        reply.code(400).send({ error: "Missing intent, signature, publicKey, or signingNonce" });
        return;
    }

    try {
        const result = await relayer.submitOrder(body.intent, body.signature, body.publicKey, body.signingNonce);
        return result;
    } catch (err: any) {
        request.log.error(err);
        reply.code(500).send({ error: err.message });
    }
});

const start = async () => {
    try {
        await server.listen({ port: 3001, host: '0.0.0.0' });
        console.log(chalk.green(`🚀 Relayer Service running on port 3001`));
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
};

start();
