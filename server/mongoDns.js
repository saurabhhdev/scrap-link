import dns from 'node:dns';

/** Configure an optional DNS fallback for MongoDB Atlas SRV and host lookups. */
export function configureMongoDns(serverList = '') {
  const servers = serverList.split(',').map((server) => server.trim()).filter(Boolean);
  if (!servers.length) return {};

  // The MongoDB driver's mongodb+srv resolver uses dns.promises.resolve*.
  // Keep this override inside the API process; it does not alter OS settings.
  dns.setServers(servers);
  const resolver = new dns.promises.Resolver();
  resolver.setServers(servers);
  const systemLookup = dns.lookup.bind(dns);
  const atlasLookup = (hostname, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (!hostname.endsWith('.mongodb.net')) return systemLookup(hostname, options, callback);

    const family = typeof options === 'number' ? options : options?.family || 0;
    const all = typeof options === 'object' && Boolean(options?.all);
    const queries = [];
    if (family === 0 || family === 4) queries.push(resolver.resolve4(hostname).then((rows) => rows.map((address) => ({ address, family: 4 }))));
    if (family === 0 || family === 6) queries.push(resolver.resolve6(hostname).then((rows) => rows.map((address) => ({ address, family: 6 }))));

    Promise.allSettled(queries).then((results) => {
      const addresses = results.filter((result) => result.status === 'fulfilled').flatMap((result) => result.value);
      if (!addresses.length) {
        const error = results.find((result) => result.status === 'rejected')?.reason || new Error(`Could not resolve ${hostname}`);
        callback(error);
      } else if (all) callback(null, addresses);
      else callback(null, addresses[0].address, addresses[0].family);
    }).catch(callback);
  };

  return { lookup: atlasLookup };
}
