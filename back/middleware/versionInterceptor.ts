import { NextFunction, Request, Response } from 'express';
import getVersion from '../core/get_version.js';

const versionInterceptor = (req: Request, res: Response, next: NextFunction) => {
  // pure passthrough payloads (the SDUI envelope for ext) must not gain extra keys
  if (req.path === '/mini/envelope.json') {
    next();
    return;
  }

  const originalJson = res.json.bind(res);

  res.json = function (body: unknown) {
    if (body && typeof body === 'object') {
      (body as Record<string, unknown>).version = getVersion();
    }
    return originalJson(body);
  } as Response['json'];

  next();
};

export default versionInterceptor;
