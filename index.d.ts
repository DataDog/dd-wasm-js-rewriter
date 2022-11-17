/* tslint:disable */
/* eslint-disable */

/* auto-generated by NAPI-RS */

export interface CsiMethod {
  src: string
  dst?: string | undefined | null
  operator?: boolean | undefined | null
}
export interface RewriterConfig {
  chainSourceMap?: boolean
  comments?: boolean
  localVarPrefix?: string
  chainSourceMap?: boolean | undefined | null
  comments?: boolean | undefined | null
  csiMethods?: Array<CsiMethod> | undefined | null
}
export class Rewriter {
  constructor(config?: RewriterConfig | undefined | null)
  rewrite(code: string, file: string): string
  csiMethods(): Array<string>
}
