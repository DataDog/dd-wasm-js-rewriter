const configs = [{
  csiMethods: [
    { src: 'concat' },
    { src: 'join' },
    { src: 'parse' },
    { src: 'plusOperator', operator: true },
    { src: 'random' },
    { src: 'replace' },
    { src: 'slice' },
    { src: 'substr' },
    { src: 'substring' },
    { src: 'toLowerCase', dst: 'stringCase' },
    { src: 'toUpperCase', dst: 'stringCase' },
    { src: 'tplOperator', operator: true },
    { src: 'trim' },
    { src: 'trimEnd' },
    { src: 'trimStart', dst: 'trim' },
    { src: 'eval', allowedWithoutCallee: true }
  ],
  orchestrion: `version: 1
dc_module: dc-polyfill
instrumentations:
  - module_name: "@langchain/core"
    version_range: ">=0.1.0"
    file_path: dist/runnables/base.js
    function_query:
      name: invoke
      type: method
      kind: async
      class: RunnableSequence
    operator: tracePromise
    channel_name: "RunnableSequence_invoke"
  - module_name: "@langchain/core"
    version_range: ">=0.1.0"
    file_path: dist/runnables/base.js
    function_query:
      name: batch
      type: method
      kind: async
      class: RunnableSequence
    operator: tracePromise
    channel_name: "RunnableSequence_batch"
  - module_name: "@langchain/core"
    version_range: ">=0.1.0"
    file_path: dist/language_models/chat_models.js
    function_query:
      name: generate
      type: method
      kind: async
      class: BaseChatModel
    operator: tracePromise
    channel_name: "BaseChatModel_generate"
  - module_name: "@langchain/core"
    version_range: ">=0.1.0"
    file_path: dist/language_models/llms.js
    function_query:
      name: generate
      type: method
      kind: async
    operator: tracePromise
    channel_name: "BaseLLM_generate"
  - module_name: "@langchain/core"
    version_range: ">=0.1.0"
    file_path: dist/embeddings.js
    function_query:
      name: constructor
      type: method
      kind: sync
      class: Embeddings
    operator: traceSync
    channel_name: "Embeddings_constructor"`
}, {
  csiMethods: [
    { src: 'concat' },
    { src: 'join' },
    { src: 'parse' },
    { src: 'plusOperator', operator: true },
    { src: 'random' }
  ],
  orchestrion: `version: 1
dc_module: dc-polyfill
instrumentations:
  - module_name: "@langchain/core"
    version_range: ">=0.1.0"
    file_path: dist/runnables/base.js
    function_query:
      name: invoke
      type: method
      kind: async
      class: RunnableSequence
    operator: tracePromise
    channel_name: "RunnableSequence_invoke"
  - module_name: "@langchain/core"
    version_range: ">=0.1.0"
    file_path: dist/language_models/chat_models.js
    function_query:
      name: generate
      type: method
      kind: async
      class: BaseChatModel
    operator: tracePromise
    channel_name: "BaseChatModel_generate"`
}, {
  csiMethods: [
    { src: 'slice' },
    { src: 'substr' },
    { src: 'substring' },
    { src: 'toLowerCase', dst: 'stringCase' },
    { src: 'toUpperCase', dst: 'stringCase' }
  ],
  orchestrion: `version: 1
dc_module: dc-polyfill
instrumentations:
  - module_name: "@langchain/core"
    version_range: ">=0.1.0"
    file_path: dist/language_models/llms.js
    function_query:
      name: generate
      type: method
      kind: async
    operator: tracePromise
    channel_name: "BaseLLM_generate"
  - module_name: "@langchain/core"
    version_range: ">=0.1.0"
    file_path: dist/embeddings.js
    function_query:
      name: constructor
      type: method
      kind: sync
      class: Embeddings
    operator: traceSync
    channel_name: "Embeddings_constructor"`
}, {
  csiMethods: [
    { src: 'trim' },
    { src: 'trimEnd' },
    { src: 'trimStart', dst: 'trim' },
    { src: 'eval', allowedWithoutCallee: true }
  ],
  orchestrion: `version: 1
dc_module: dc-polyfill
instrumentations:
  - module_name: "@langchain/core"
    version_range: ">=0.1.0"
    file_path: dist/runnables/base.js
    function_query:
      name: batch
      type: method
      kind: async
      class: RunnableSequence
    operator: tracePromise
    channel_name: "RunnableSequence_batch"`
}]

let count = 0

const { Rewriter } = require('../../../main')

for (let i = 0; i < 1e2; i++) {
  for (const config of configs) {
    const instance = new Rewriter({
      csiMethods: config.csiMethods,
      orchestrion: config.orchestrion
    })
    count += instance.orchestrionModules ? 1 : 0
  }
}

if (count === 0) {
  // eslint-disable-next-line no-console
  console.log('This cannot happen, but count is used to avoid optimizations')
}
