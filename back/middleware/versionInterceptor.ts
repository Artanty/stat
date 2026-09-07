import { NextFunction, Request, Response } from 'express';
import getVersion from '../core/get_version.js';

const versionInterceptor = (req: Request, res: Response, next: NextFunction) => {
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
