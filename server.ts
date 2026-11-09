import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiApp from './api/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Vite development middleware or static asset serving
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    apiApp.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    apiApp.use(express.static(distPath));
    apiApp.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  apiApp.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT} (${isProduction ? 'produção' : 'desenvolvimento'})`);
  });
}

startServer().catch((err) => {
  console.error('Falha crítica ao iniciar servidor:', err);
  process.exit(1);
});
