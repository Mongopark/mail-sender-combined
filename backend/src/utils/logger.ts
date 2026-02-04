import appRoot from 'app-root-path';
import { createLogger, transports, format, Logger } from 'winston';
import morgan, { StreamOptions } from 'morgan';

// Define logging options
const options = {
  file: {
    level: 'info',
    filename: `${appRoot}/logs/app.log`,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false, // Colorize should be false for file transport
  },
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
  },
};

// Determine the environment
const isProduction = process.env.NODE_ENV === 'production';

// Create an array of transports based on the environment
const loggerTransports = isProduction
  ? [new transports.File(options.file)]
  : [new transports.Console(options.console)];

// Create a new Winston Logger instance
const logger: Logger & { stream: StreamOptions } = createLogger({
  level: 'debug',
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    format.printf(
      ({ level, message, timestamp }) => `${timestamp} [${level}]: ${message}`,
    ),
  ),
  transports: loggerTransports,
  exitOnError: false, // Do not exit on handled exceptions
}) as Logger & { stream: StreamOptions };

// Add a stream object for Morgan to use
(logger as any).stream = 
{
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
