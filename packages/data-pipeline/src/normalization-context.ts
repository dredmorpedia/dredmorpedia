import type { SourceDefinition } from "./manifest";
import type { DiagnosticDraft, ParsedXml } from "./xml-adapter";

export interface NormalizationContext {
  source: SourceDefinition;
  assetRoots: readonly {
    absolutePath: string;
    displayPath: string;
  }[];
  file: string;
  parsed: ParsedXml;
  diagnostics: DiagnosticDraft[];
  registerInput: (absolutePath: string, displayPath: string) => void;
}
