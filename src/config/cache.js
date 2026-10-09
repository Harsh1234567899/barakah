const NodeCache = require('node-cache');

const roleCache = new NodeCache({ stdTTL: 0, useClones: false });
const ROLES_ACCESS_CACHE_KEY = 'roles-access';

module.exports = { roleCache, ROLES_ACCESS_CACHE_KEY };