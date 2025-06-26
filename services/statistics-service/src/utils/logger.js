const pino = require('pino');
const { config } = require('../config');

const logger = pino({
  level: config.logging.level,
  transport: config.logging.prettyPrint ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    }
  } : undefined,
  base: {
    service: 'statistics-service',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger; 