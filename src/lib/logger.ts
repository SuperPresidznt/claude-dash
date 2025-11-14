type LogLevel = 'info' | 'warn' | 'error';

type LogMetadata = Record<string, unknown> | undefined;

const formatMetadata = (metadata: LogMetadata) => {
  if (!metadata || Object.keys(metadata).length === 0) {
    return undefined;
  }
  return metadata;
};

const log = (level: LogLevel, message: string, metadata?: LogMetadata) => {
  const formattedMeta = formatMetadata(metadata);

  if (formattedMeta) {
    const payload = { level, message, ...formattedMeta };
    if (level === 'error') {
      console.error(payload);
    } else if (level === 'warn') {
      console.warn(payload);
    } else {
      console.info(payload);
    }
  } else {
    if (level === 'error') {
      console.error(message);
    } else if (level === 'warn') {
      console.warn(message);
    } else {
      console.info(message);
    }
  }
};

const extractError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  return { message: String(error) };
};

export const logger = {
  info: (message: string, metadata?: LogMetadata) => log('info', message, metadata),
  warn: (message: string, metadata?: LogMetadata) => log('warn', message, metadata),
  error: (message: string, metadata?: LogMetadata & { error?: unknown }) => {
    const metaWithError = metadata ?? {};
    const error = metaWithError.error;
    if (error) {
      metaWithError.error = extractError(error);
    }
    log('error', message, metaWithError);
  }
};

export const withUserContext = (userId: string | null, metadata?: LogMetadata) => {
  return {
    ...(metadata ?? {}),
    ...(userId ? { userId } : {})
  };
};
