export enum ServerMode {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

export const getServerMode = (): ServerMode => {
  if (process.env.NODE_ENV === ServerMode.PRODUCTION) {
    return ServerMode.PRODUCTION;
  }

  if (
    !!process.env.JEST_WORKER_ID ||
    process.env.NODE_ENV === ServerMode.TEST
  ) {
    return ServerMode.TEST;
  }

  return ServerMode.DEVELOPMENT;
};
