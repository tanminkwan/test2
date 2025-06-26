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
    service: 'event-processor',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

logger.debugAlways = (...args) => {
  if (DEBUG_MODE) {
    logger.info('[DEBUG]', ...args);
  }
};

module.exports = logger; 