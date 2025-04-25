#[cfg(test)]
mod tests {
    use crate::{
        rewriter::Config, telemetry::TelemetryVerbosity, tests::CsiMethods, util::DefaultFileReader,
    };
    use speculoos::{assert_that, string::StrAssertions};

    const ORCHESTRION_CONFIG: &str = "
version: 1
instrumentations:
  - module_name: undici
    version_range: '>= 0.0.1'
    file_path: index.js
    operator: tracePromise
    channel_name: fetch
    function_query:
      name: fetch
      type: expr
      kind: async
    ";

    const UNDICI_CODE: &str = "
        module.exports.fetch = async function fetch () {
            return 42
        }
    ";

    const UNDICI_CODE_REAL: &str = "
const Client = require('./lib/dispatcher/client');
const Dispatcher = require('./lib/dispatcher/dispatcher');
const Pool = require('./lib/dispatcher/pool');
const BalancedPool = require('./lib/dispatcher/balanced-pool');
const Agent = require('./lib/dispatcher/agent');
const ProxyAgent = require('./lib/dispatcher/proxy-agent');
const EnvHttpProxyAgent = require('./lib/dispatcher/env-http-proxy-agent');
const RetryAgent = require('./lib/dispatcher/retry-agent');
const errors = require('./lib/core/errors');
const util = require('./lib/core/util');
const { InvalidArgumentError } = errors;
const api = require('./lib/api');
const buildConnector = require('./lib/core/connect');
const MockClient = require('./lib/mock/mock-client');
const MockAgent = require('./lib/mock/mock-agent');
const MockPool = require('./lib/mock/mock-pool');
const mockErrors = require('./lib/mock/mock-errors');
const RetryHandler = require('./lib/handler/retry-handler');
const { getGlobalDispatcher, setGlobalDispatcher } = require('./lib/global');
const DecoratorHandler = require('./lib/handler/decorator-handler');
const RedirectHandler = require('./lib/handler/redirect-handler');
Object.assign(Dispatcher.prototype, api);
module.exports.Dispatcher = Dispatcher;
module.exports.Client = Client;
module.exports.Pool = Pool;
module.exports.BalancedPool = BalancedPool;
module.exports.Agent = Agent;
module.exports.ProxyAgent = ProxyAgent;
module.exports.EnvHttpProxyAgent = EnvHttpProxyAgent;
module.exports.RetryAgent = RetryAgent;
module.exports.RetryHandler = RetryHandler;
module.exports.DecoratorHandler = DecoratorHandler;
module.exports.RedirectHandler = RedirectHandler;
module.exports.interceptors = {
    redirect: require('./lib/interceptor/redirect'),
    responseError: require('./lib/interceptor/response-error'),
    retry: require('./lib/interceptor/retry'),
    dump: require('./lib/interceptor/dump'),
    dns: require('./lib/interceptor/dns'),
    cache: require('./lib/interceptor/cache')
};
module.exports.cacheStores = {
    MemoryCacheStore: require('./lib/cache/memory-cache-store')
};
const SqliteCacheStore = require('./lib/cache/sqlite-cache-store');
module.exports.cacheStores.SqliteCacheStore = SqliteCacheStore;
module.exports.buildConnector = buildConnector;
module.exports.errors = errors;
module.exports.util = {
    parseHeaders: util.parseHeaders,
    headerNameToString: util.headerNameToString
};
function makeDispatcher(fn) {
    return (url, opts, handler)=>{
        if (typeof opts === 'function') {
            handler = opts;
            opts = null;
        }
        if (!url || (typeof url !== 'string' && typeof url !== 'object' && !(url instanceof URL))) {
            throw new InvalidArgumentError('invalid url');
        }
        if (opts != null && typeof opts !== 'object') {
            throw new InvalidArgumentError('invalid opts');
        }
        if (opts && opts.path != null) {
            if (typeof opts.path !== 'string') {
                throw new InvalidArgumentError('invalid opts.path');
            }
            let path = opts.path;
            if (!opts.path.startsWith('/')) {
                path = `/${path}`;
            }
            url = new URL(util.parseOrigin(url).origin + path);
        } else {
            if (!opts) {
                opts = typeof url === 'object' ? url : {};
            }
            url = util.parseURL(url);
        }
        const { agent, dispatcher = getGlobalDispatcher() } = opts;
        if (agent) {
            throw new InvalidArgumentError('unsupported opts.agent. Did you mean opts.client?');
        }
        return fn.call(dispatcher, {
            ...opts,
            origin: url.origin,
            path: url.search ? `${url.pathname}${url.search}` : url.pathname,
            method: opts.method || (opts.body ? 'PUT' : 'GET')
        }, handler);
    };
}
module.exports.setGlobalDispatcher = setGlobalDispatcher;
module.exports.getGlobalDispatcher = getGlobalDispatcher;
const fetchImpl = require('./lib/web/fetch').fetch;
module.exports.fetch = async function fetch(init, options = undefined) {
    try {
        return await fetchImpl(init, options);
    } catch (err) {
        if (err && typeof err === 'object') {
            Error.captureStackTrace(err);
        }
        throw err;
    }
};
module.exports.Headers = require('./lib/web/fetch/headers').Headers;
module.exports.Response = require('./lib/web/fetch/response').Response;
module.exports.Request = require('./lib/web/fetch/request').Request;
module.exports.FormData = require('./lib/web/fetch/formdata').FormData;
const { setGlobalOrigin, getGlobalOrigin } = require('./lib/web/fetch/global');
module.exports.setGlobalOrigin = setGlobalOrigin;
module.exports.getGlobalOrigin = getGlobalOrigin;
const { CacheStorage } = require('./lib/web/cache/cachestorage');
const { kConstruct } = require('./lib/core/symbols');
module.exports.caches = new CacheStorage(kConstruct);
const { deleteCookie, getCookies, getSetCookies, setCookie, parseCookie } = require('./lib/web/cookies');
module.exports.deleteCookie = deleteCookie;
module.exports.getCookies = getCookies;
module.exports.getSetCookies = getSetCookies;
module.exports.setCookie = setCookie;
module.exports.parseCookie = parseCookie;
const { parseMIMEType, serializeAMimeType } = require('./lib/web/fetch/data-url');
module.exports.parseMIMEType = parseMIMEType;
module.exports.serializeAMimeType = serializeAMimeType;
const { CloseEvent, ErrorEvent, MessageEvent } = require('./lib/web/websocket/events');
module.exports.WebSocket = require('./lib/web/websocket/websocket').WebSocket;
module.exports.CloseEvent = CloseEvent;
module.exports.ErrorEvent = ErrorEvent;
module.exports.MessageEvent = MessageEvent;
module.exports.WebSocketStream = require('./lib/web/websocket/stream/websocketstream').WebSocketStream;
module.exports.WebSocketError = require('./lib/web/websocket/stream/websocketerror').WebSocketError;
module.exports.request = makeDispatcher(api.request);
module.exports.stream = makeDispatcher(api.stream);
module.exports.pipeline = makeDispatcher(api.pipeline);
module.exports.connect = makeDispatcher(api.connect);
module.exports.upgrade = makeDispatcher(api.upgrade);
module.exports.MockClient = MockClient;
module.exports.MockPool = MockPool;
module.exports.MockAgent = MockAgent;
module.exports.mockErrors = mockErrors;
const { EventSource } = require('./lib/web/eventsource/eventsource');
module.exports.EventSource = EventSource;
";
    fn rewrite(code: &str, iast: bool, orchestrion: bool) -> String {
        let mut config = Config {
            chain_source_map: false,
            print_comments: false,
            local_var_prefix: "test".to_string(),
            csi_methods: CsiMethods::new(&vec![]),
            verbosity: TelemetryVerbosity::Debug,
            literals: false,
            file_iast_prefix_code: Vec::new(),
            file_errtracking_prefix_code: Vec::new(),
            strict: false,
            instrumentor: if orchestrion {
                Some(ORCHESTRION_CONFIG.parse().unwrap())
            } else {
                None
            },
        };
        let passes: &[String] = if iast && orchestrion {
            &*vec!["instrumentation".to_string(), "orchestrion".to_string()]
        } else if iast {
            &*vec!["instrumentation".to_string()]
        } else if orchestrion {
            &*vec!["orchestrion".to_string()]
        } else {
            &*vec![]
        };
        let source_map_reader = DefaultFileReader {};
        crate::rewriter::rewrite_js(
            code.to_string(),
            "/foo/bar/node_modules/undici/index.js",
            &mut config,
            &source_map_reader,
            passes,
            Some("undici"),
            Some("1.0.0"),
        )
        .unwrap()
        .code
    }

    #[test]
    fn test_orchestrion_without_iast() {
        let new_code = rewrite(UNDICI_CODE_REAL, false, true);

        // We're only asserting that the new code contains the `tracePromise` call. Detailed
        // stuff will be tested in the JS tests.
        assert_that(&new_code).contains("tr_ch_apm$fetch.tracePromise(");
    }

    #[test]
    fn test_orchestrion_with_iast() {
        let new_code = rewrite(UNDICI_CODE, true, true);

        assert_that(&new_code).contains("tr_ch_apm$fetch.tracePromise(");
    }

    #[test]
    fn test_no_orchestrion_with_iast() {
        let new_code = rewrite(UNDICI_CODE, true, false);

        assert_that(&new_code).does_not_contain("tr_ch_apm$fetch.tracePromise(");
    }
}
