/* tslint:disable */
/* eslint-disable */

/* auto-generated by NAPI-RS */

export interface RewriterConfig {
  chainSourceMap?: boolean
  comments?: boolean
  localVarPrefix?: string
}
export class Rewriter {
  constructor(config?: RewriterConfig | undefined | null)
  rewrite(code: string, file: string): string
}
