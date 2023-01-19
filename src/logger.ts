import consola, { BasicReporter, FancyReporter } from 'consola';

export const logger = consola.create({
  reporters:
    process.env.NODE_ENV === 'production'
      ? [new BasicReporter()]
      : [new FancyReporter()],
});
