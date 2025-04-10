/* tslint:disable */
/* eslint-disable */

export interface CsiMethod {
  src: string
  dst?: string
  operator?: boolean
  allowedWithoutCallee?: boolean
}
export interface RewriterConfig {
  chainSourceMap?: boolean
  comments?: boolean
  localVarPrefix?: string
  csiMethods?: Array<CsiMethod>
  literals?: boolean
  orchestrion?: string
}
export interface Result {
  content: string
  metrics?: Metrics
  literalsResult?: LiteralsResult
}
export interface Metrics {
  status: string
  instrumentedPropagation: number
  file: string
  propagationDebug?: Record<string, number>
}
export interface LiteralsResult {
  file: string
  literals: Array<LiteralInfo>
}
export interface LiteralLocation {
  ident?: string
  line: number
  column: number
}
export interface LiteralInfo {
  value: string
  locations: Array<LiteralLocation>
}
export class NonCacheRewriter {
  constructor(config?: RewriterConfig | undefined | null)
  rewrite(code: string, file: string): Result
  csiMethods(): Array<string>
}

export const Rewriter: NonCacheRewriter

export function cacheRewrittenSourceMap(filename: string, fileContent: string): void
