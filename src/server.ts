import express, { Application } from 'express';
import lusca from 'lusca';
import type { Server as HttpServer } from 'http';
import { Socket } from 'net';
import cors, { CorsOptions } from 'cors';
import dotenv from 'dotenv';
import appRoot from 'app-root-path';
import getPort from 'get-port';
import { logger } from './logger';
import { getServerMode, ServerMode } from './server-mode';
import { disableCache } from './cache';
import { handleImageRequest } from './image-request-handler';

dotenv.config();

const shouldLog = getServerMode() !== ServerMode.TEST;

export interface Server extends HttpServer {
  destroy: () => Promise<void>;
}

type Sockets = {
  [x: string]: Socket;
};

export type ServerOptions = {
  app?: Application;
  host?: string;
  port?: number;
  corsOptions?: CorsOptions;
};

/**
 * Configure some basic security settings.
 */
const setupSecurity = (app: Application) => {
  app.use(
    lusca({
      referrerPolicy: 'same-origin',
      xframe: 'SAMEORIGIN',
      xssProtection: true,
    }),
  );

  app.disable('x-powered-by');
};

/**
 * Trust proxies in production mode.
 * @see http://expressjs.com/en/guide/behind-proxies.html
 */
const trustProxies = (app: Application) => {
  if (getServerMode() !== ServerMode.PRODUCTION) {
    return;
  }

  app.set('trust proxy', 1);
};

/**
 * Listen for requests and return the running server.
 */
const listen = ({
  app,
  host,
  port,
}: Required<ServerOptions>): Promise<HttpServer> =>
  new Promise((resolve) => {
    let server: HttpServer;

    const callback = () => {
      if (shouldLog) {
        logger.info(`Server Mode: ${getServerMode()}`);
        logger.success(`Server listening on http://${host}:${port}`);
      }

      resolve(server);
    };

    server = app.listen(port, host, callback).on('error', (err: Error) => {
      logger.error(err);
    });
  });

/**
 * Setup a healthcheck route.
 *
 * The healthcheck route is defined here, rather that in a controller file, as
 * it needs to be served without any route prefix (e.g. /healthcheck not
 * /v1/healthcheck). Plus it isn't really part of the public API.
 */
const defineHealthcheck = (app: Application) => {
  app.get('/healthcheck', (req, res) => {
    disableCache(res);
    res.json({
      version: process.env.APP_VERSION || '',
      environment: process.env.APP_ENV || '',
    });
  });
};

/**
 * Enhance the regular HTTP server with some additional functionality.
 */
const createServer = (server: HttpServer): Server => {
  const enhancedServer = server as Server;
  const sockets: Sockets = {};

  // Keep a reference to any connections.
  enhancedServer.on('connection', (socket: Socket) => {
    const key = `${socket.remoteAddress}:${socket.remotePort}`;

    sockets[key] = socket;

    socket.on('close', () => {
      delete sockets[key];
    });
  });

  // Close the server and destroy any open connections.
  enhancedServer.destroy = () =>
    new Promise((resolve) => {
      server.close(() => {
        resolve();
      });

      Object.values(sockets).forEach((socket: Socket) => {
        socket.destroy();
      });
    });

  return enhancedServer;
};

/**
 * Get the port to listen to.
 *
 * Falls back to an alternative in dev mode if necessary.
 */
const getAvailablePort = async (requestedPort: number) => {
  if (getServerMode() !== ServerMode.DEVELOPMENT) {
    return requestedPort;
  }

  const availablePort = await getPort({
    port: Array(10)
      .fill(null)
      .map((_, i) => requestedPort + i),
  });

  if (availablePort !== requestedPort) {
    logger.info(
      `Requested port ${requestedPort} is unavailable, falling back to ${availablePort}`,
    );
  }

  return availablePort;
};

/**
 * Get the server options with defaults for any not explicitly defined.
 */
const getServerOptions = async (
  serverOptions: ServerOptions,
): Promise<Required<ServerOptions>> => {
  const defaultServerOptions = {
    app: express(),
    host: process.env.HOST || '127.0.0.1',
    port: Number(process.env.PORT || 7000),
    rootDir: appRoot.path,
  };

  const mergedOptions = { ...defaultServerOptions, ...serverOptions };
  const availablePort = await getAvailablePort(mergedOptions.port);

  return {
    ...mergedOptions,
    port: availablePort,
    corsOptions: { origin: '*' },
  };
};

/**
 * Launch the server.
 */
export const launch = async (serverOptions: ServerOptions): Promise<Server> => {
  const finalServerOptions = await getServerOptions(serverOptions);

  const { app, port, corsOptions } = finalServerOptions;

  app.set('port', port);

  app.use(express.urlencoded({ extended: false }));

  app.use(cors(corsOptions));

  setupSecurity(app);
  trustProxies(app);

  defineHealthcheck(app);
  app.get('*', handleImageRequest);

  const server = await listen(finalServerOptions);

  return createServer(server);
};

/**
 * Launch the server, exiting the process if any error occurs.
 */
export const launchServer = async (
  serverOptions: ServerOptions,
): Promise<Server> => {
  let server;

  try {
    server = await launch(serverOptions);
  } catch (error: any) {
    console.error(error);
    process.exit(1);
  }

  return server;
};
