import getVersion from '../core/get_version.js'
const versionInterceptor = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(body) {
    if (body && typeof body === 'object') {
      body.version = getVersion()
    }
    originalJson.call(this, body);
  };
  
  next();
};

export default versionInterceptor;